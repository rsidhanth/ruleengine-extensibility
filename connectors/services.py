import requests
import time
import json
import re
import uuid
import logging
from django.conf import settings
from django.utils import timezone
from .models import Connector, ConnectorAction, Credential, ConnectionTest, AsyncActionExecution, AsyncActionProgress
from requests.auth import HTTPBasicAuth
from .custom_auth_service import CustomAuthService

logger = logging.getLogger(__name__)


class ConnectorService:
    def __init__(self):
        self.timeout = 30  # Default timeout in seconds

    def prepare_auth(self, credential, credential_set=None):
        """Prepare authentication for the request

        Args:
            credential: Credential model instance (defines auth type and configuration)
            credential_set: CredentialSet model instance (contains actual credential values)
        """
        if not credential or credential.auth_type == 'none':
            return None, {}

        # If credential_set is provided, use values from it
        if credential_set:
            credential_values = credential_set.credential_values or {}

            if credential.auth_type == 'basic':
                username = credential_values.get('username', '')
                password = credential_values.get('password', '')
                return HTTPBasicAuth(username, password), {}

            elif credential.auth_type == 'api_key':
                header_name = credential.api_key_header or 'X-API-Key'
                api_key = credential_values.get('api_key', '')
                return None, {header_name: api_key}

            elif credential.auth_type == 'bearer':
                bearer_token = credential_values.get('bearer_token', '')
                return None, {'Authorization': f'Bearer {bearer_token}'}

            elif credential.auth_type == 'oauth2':
                # Check if token needs refresh (use OAuth2Service for this)
                try:
                    from .oauth2_service import OAuth2Service
                    if OAuth2Service.is_token_expired(credential_set):
                        logger.info(f"OAuth2 token expired for credential set, refreshing...")
                        OAuth2Service.refresh_token(credential_set)
                        # Reload credential values after refresh
                        credential_set.refresh_from_db()
                        credential_values = credential_set.credential_values or {}
                except Exception as e:
                    logger.warning(f"Error checking/refreshing OAuth2 token: {e}")

                # OAuth2 tokens can be stored as 'access_token' (from OAuth2 callback)
                # or 'oauth2_access_token' (legacy format)
                access_token = credential_values.get('access_token') or credential_values.get('oauth2_access_token', '')
                if access_token:
                    # Use configured token header and prefix, with defaults
                    header_name = credential.oauth2_token_header or 'Authorization'
                    token_prefix = credential.oauth2_token_prefix or 'Bearer'
                    if token_prefix:
                        return None, {header_name: f'{token_prefix} {access_token}'}
                    else:
                        return None, {header_name: access_token}
                return None, {}

            elif credential.auth_type == 'custom':
                # Use custom authentication service with credential set
                custom_auth_service = CustomAuthService()
                auth_values = custom_auth_service.get_auth_values(credential, credential_set)
                return None, auth_values

        # Fallback to old credential model (for backward compatibility)
        else:
            if credential.auth_type == 'basic':
                return HTTPBasicAuth(credential.username, credential.password), {}

            elif credential.auth_type == 'api_key':
                header_name = credential.api_key_header or 'X-API-Key'
                return None, {header_name: credential.api_key}

            elif credential.auth_type == 'bearer':
                return None, {'Authorization': f'Bearer {credential.bearer_token}'}

            elif credential.auth_type == 'oauth2':
                if credential.oauth2_access_token:
                    # Use configured token header and prefix, with defaults
                    header_name = credential.oauth2_token_header or 'Authorization'
                    token_prefix = credential.oauth2_token_prefix or 'Bearer'
                    if token_prefix:
                        return None, {header_name: f'{token_prefix} {credential.oauth2_access_token}'}
                    else:
                        return None, {header_name: credential.oauth2_access_token}
                return None, {}

            elif credential.auth_type == 'custom':
                custom_auth_service = CustomAuthService()
                auth_values = custom_auth_service.get_auth_values(credential)
                return None, auth_values

        return None, {}
    
    def _create_progress_entry(self, async_execution, step_type, endpoint_url, http_method,
                              attempt_number=1, request_headers=None, request_params=None, request_body=None):
        """Create a progress entry for async action tracking"""
        return AsyncActionProgress.objects.create(
            async_execution=async_execution,
            step_type=step_type,
            endpoint_url=endpoint_url,
            http_method=http_method,
            attempt_number=attempt_number,
            request_headers=request_headers or {},
            request_params=request_params or {},
            request_body=request_body or {},
            status='in_progress'
        )
    
    def _complete_progress_entry(self, progress_entry, http_status_code, response_time_ms,
                                response_headers=None, response_body=None, status='success', error_message=None, notes=None):
        """Complete a progress entry with response details"""
        progress_entry.http_status_code = http_status_code
        progress_entry.response_time_ms = response_time_ms
        progress_entry.response_headers = response_headers or {}
        progress_entry.response_body = response_body or {}
        progress_entry.status = status
        progress_entry.error_message = error_message if error_message else None
        progress_entry.notes = notes if notes else None
        progress_entry.completed_at = timezone.now()
        progress_entry.save()
        return progress_entry

    def build_url(self, connector, action, path_params=None):
        """Build the full URL for the request with path parameter substitution"""
        base_url = connector.base_url.rstrip('/')
        endpoint_path = action.endpoint_path.lstrip('/')
        
        # Process path parameters
        if path_params or action.path_params:
            # Merge default path params with custom ones
            final_path_params = action.path_params.copy() if action.path_params else {}
            if path_params:
                final_path_params.update(path_params)
            
            # Replace {param} placeholders in endpoint_path
            processed_path = self._process_path_template(endpoint_path, final_path_params)
            return f"{base_url}/{processed_path}" if processed_path else base_url
        
        return f"{base_url}/{endpoint_path}" if endpoint_path else base_url
    
    def _process_path_template(self, path_template, path_params):
        """Replace {param} placeholders with actual values"""
        processed_path = path_template
        for param_name, param_value in path_params.items():
            placeholder = f"{{{param_name}}}"
            if placeholder in processed_path:
                processed_path = processed_path.replace(placeholder, str(param_value))
        return processed_path
    
    def _evaluate_success_criteria(self, criteria_expression, response_data):
        """
        Evaluate custom success criteria against API response data.
        Supports expressions like: status == 1 && data.documentId != null
        """
        try:
            if not criteria_expression or not criteria_expression.strip():
                return True, ""
            
            # Prepare the evaluation context with response data
            context = {'response': response_data}
            
            # Add shorthand access to common fields
            if isinstance(response_data, dict):
                context.update(response_data)
            
            # Convert expression to Python-compatible format
            python_expr = self._convert_success_expression(criteria_expression)
            
            # Evaluate the expression safely
            result = self._safe_eval_expression(python_expr, context)
            
            if result is True:
                return True, ""
            else:
                return False, f"Success criteria failed: {criteria_expression} (evaluated to {result})"
                
        except Exception as e:
            return False, f"Success criteria evaluation error: {str(e)}"
    
    def _convert_success_expression(self, expression):
        """Convert success criteria expression to Python-compatible format"""
        # Replace common operators and keywords
        replacements = {
            '&&': ' and ',
            '||': ' or ',
            '==': ' == ',
            '!=': ' != ',
            'null': 'None',
            'true': 'True',
            'false': 'False'
        }
        
        python_expr = expression
        for old, new in replacements.items():
            python_expr = python_expr.replace(old, new)
        
        # Handle dot notation access (e.g., data.documentId -> response.get('data', {}).get('documentId'))
        import re
        dot_pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)\b'
        
        def replace_dot_notation(match):
            path = match.group(1)
            parts = path.split('.')
            
            # Build nested get() calls
            result = f"response.get('{parts[0]}')"
            for part in parts[1:]:
                result = f"({result} or {{}}).get('{part}')"
            
            return result
        
        python_expr = re.sub(dot_pattern, replace_dot_notation, python_expr)
        
        return python_expr
    
    def _safe_eval_expression(self, expression, context):
        """Safely evaluate Python expression with limited context"""
        # Whitelist of allowed functions and operators
        allowed_names = {
            '__builtins__': {},
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'None': None,
            'True': True,
            'False': False,
        }
        
        # Add context variables
        allowed_names.update(context)
        
        try:
            return eval(expression, {"__builtins__": {}}, allowed_names)
        except Exception as e:
            raise ValueError(f"Expression evaluation failed: {str(e)}")

    def validate_mandatory_params(self, action, custom_params=None, custom_headers=None, custom_body_params=None, custom_path_params=None):
        """Validate that all mandatory parameters are provided"""
        errors = []
        
        # Validate mandatory path parameters
        if action.path_params_config:
            for param_name, config in action.path_params_config.items():
                if config.get('mandatory', False):
                    # Check if parameter is provided either in action defaults or custom params
                    default_value = action.path_params.get(param_name) if action.path_params else None
                    custom_value = custom_path_params.get(param_name) if custom_path_params else None
                    
                    if not default_value and not custom_value:
                        param_desc = config.get('description', '')
                        error_msg = f"Missing mandatory path parameter '{param_name}'"
                        if param_desc:
                            error_msg += f" ({param_desc})"
                        errors.append(error_msg)
        
        # Validate mandatory query parameters
        if action.query_params_config:
            for param_name, config in action.query_params_config.items():
                if config.get('mandatory', False):
                    # Check if parameter is provided either in action defaults or custom params
                    has_default = param_name in (action.query_params or {})
                    has_custom = param_name in (custom_params or {})
                    if not (has_default or has_custom):
                        errors.append(f"Mandatory query parameter '{param_name}' is missing")
        
        # Validate mandatory headers
        if action.headers_config:
            for header_name, config in action.headers_config.items():
                if config.get('mandatory', False):
                    # Check if header is provided either in action defaults or custom headers
                    has_default = header_name in (action.headers or {})
                    has_custom = header_name in (custom_headers or {})
                    if not (has_default or has_custom):
                        errors.append(f"Mandatory header '{header_name}' is missing")
        
        # Validate mandatory request body parameters
        if action.request_body_params:
            for param_name, config in action.request_body_params.items():
                if config.get('mandatory', False):
                    # Check if parameter is provided in custom body params
                    if not custom_body_params or param_name not in custom_body_params:
                        # Check if it has a default value in the template
                        if not self._has_default_in_template(action.request_body_template, param_name):
                            errors.append(f"Mandatory request body parameter '{param_name}' is missing")
        
        return errors
    
    def _has_default_in_template(self, template, param_name):
        """Check if a parameter has a default value in the request body template"""
        if not template:
            return False
        # Simple check to see if parameter path exists with a non-placeholder value
        return self._get_nested_value(template, param_name) is not None
    
    def _get_nested_value(self, obj, path):
        """Get a nested value from an object using dot notation"""
        try:
            keys = path.split('.')
            value = obj
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
            return value
        except:
            return None
    
    def _set_nested_value(self, obj, path, value):
        """Set a nested value in an object using dot notation"""
        keys = path.split('.')
        current = obj
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value
    
    def build_request_body(self, action, custom_body_params=None):
        """Build the request body from template and parameters"""
        if not action.request_body_template:
            # Fallback to simple request_body field if no template
            result = action.request_body.copy() if action.request_body else {}
            if custom_body_params:
                result.update(custom_body_params)
            return result
        
        # Start with the template
        result = json.loads(json.dumps(action.request_body_template))  # Deep copy
        
        # Apply custom parameters
        if custom_body_params:
            for param_name, param_value in custom_body_params.items():
                self._set_nested_value(result, param_name, param_value)
        
        # Apply default values from request_body_params config
        if action.request_body_params:
            for param_name, config in action.request_body_params.items():
                if 'default' in config and param_name not in (custom_body_params or {}):
                    # Only set default if parameter wasn't provided and doesn't exist in template
                    if self._get_nested_value(result, param_name) is None:
                        self._set_nested_value(result, param_name, config['default'])
        
        return result

    def execute_action(self, connector, action, custom_params=None, custom_headers=None, custom_body=None, custom_body_params=None,
                      custom_path_params=None, workflow_execution=None, workflow_rule=None, rule_execution=None, credential_set_id=None):
        """Execute a connector action and return the response with comprehensive logging

        Args:
            credential_set_id: Optional ID of the credential set to use. If not provided, uses the default credential set.
        """
        start_time = time.time()
        request_timestamp = timezone.now()

        # Initialize API call log
        api_log = None

        try:
            # Validate mandatory parameters
            validation_errors = self.validate_mandatory_params(action, custom_params, custom_headers, custom_body_params, custom_path_params)
            if validation_errors:
                # Log validation error with detailed parameter information
                try:
                    build_url_result = self.build_url(connector, action, custom_path_params)
                except:
                    build_url_result = f"{connector.base_url}/{action.endpoint_path}"

                self._log_api_call(
                    workflow_execution, workflow_rule, rule_execution,
                    action.name, connector.name, action.http_method,
                    build_url_result,
                    custom_headers or {},
                    {
                        'path_params': custom_path_params or {},
                        'query_params': custom_params or {},
                        'body_params': custom_body_params or {}
                    },
                    custom_body or {},
                    'validation_error', None, {}, {},
                    f'Mandatory parameter validation failed: {"; ".join(validation_errors)}',
                    request_timestamp, timezone.now(),
                    int((time.time() - start_time) * 1000),
                    False, validation_errors
                )
                return {
                    'success': False,
                    'error': 'Mandatory parameter validation failed',
                    'validation_errors': validation_errors,
                    'error_type': 'validation_error',
                    'response_time_ms': int((time.time() - start_time) * 1000)
                }

            # Get credential set (use provided ID or default)
            credential_set = None
            if connector.credential:
                if credential_set_id:
                    from .models import CredentialSet
                    try:
                        credential_set = CredentialSet.objects.get(
                            id=credential_set_id,
                            credential=connector.credential
                        )
                    except CredentialSet.DoesNotExist:
                        logger.warning(f"Credential set {credential_set_id} not found, falling back to default")
                        credential_set = connector.credential.credential_sets.filter(is_default=True).first()
                else:
                    # Use default credential set
                    credential_set = connector.credential.credential_sets.filter(is_default=True).first()

            # Prepare authentication
            auth, auth_headers = self.prepare_auth(connector.credential, credential_set)
            
            # Build URL with path parameters
            url = self.build_url(connector, action, custom_path_params)
            
            # Prepare headers
            headers = action.headers.copy() if action.headers else {}
            headers.update(auth_headers)
            if custom_headers:
                headers.update(custom_headers)
            
            # Prepare query parameters
            params = action.query_params.copy() if action.query_params else {}
            if custom_params:
                params.update(custom_params)
            
            # Prepare request body
            json_data = None
            logger.info(f"execute_action: action.http_method = {action.http_method}")
            logger.info(f"execute_action: custom_body = {custom_body}")
            logger.info(f"execute_action: custom_body_params = {custom_body_params}")

            if action.http_method in ['POST', 'PUT', 'PATCH']:
                # Priority: custom_body (direct JSON) > custom_body_params (template-based) > default
                if custom_body is not None:
                    # Use custom_body directly - this is raw JSON to send as-is
                    json_data = custom_body
                    logger.info(f"execute_action: Using custom_body directly as json_data: {json_data}")
                elif custom_body_params is not None:
                    # Use new structured approach with templates
                    json_data = self.build_request_body(action, custom_body_params)
                    logger.info(f"execute_action: Built json_data from custom_body_params: {json_data}")
                else:
                    # Fallback to action's default request body
                    json_data = action.request_body.copy() if action.request_body else {}
                    logger.info(f"execute_action: Using default request body: {json_data}")
            
            # Make the request
            logger.info(f"execute_action: Making request with:")
            logger.info(f"  - method: {action.http_method}")
            logger.info(f"  - url: {url}")
            logger.info(f"  - params: {params}")
            logger.info(f"  - json: {json_data if json_data else None}")

            response = requests.request(
                method=action.http_method,
                url=url,
                params=params,
                headers=headers,
                json=json_data if json_data else None,
                auth=auth,
                timeout=self.timeout
            )
            
            # Calculate response time
            response_timestamp = timezone.now()
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Check if request was successful (2xx status codes)
            http_success = 200 <= response.status_code < 300
            response_body = self._safe_json_decode(response.text)
            
            # Evaluate custom success criteria if enabled
            final_success = http_success
            success_error_msg = ''
            
            if http_success and action.enable_custom_success_logic and action.success_criteria:
                criteria_success, criteria_error = self._evaluate_success_criteria(
                    action.success_criteria, response_body
                )
                final_success = criteria_success
                if not criteria_success:
                    success_error_msg = criteria_error
            
            # Determine final status and error message
            status_type = 'success' if final_success else 'failed'
            error_msg = ''
            
            if not http_success:
                # HTTP-level failure
                error_msg = f'HTTP {response.status_code}: {response.reason}'
                if response.text:
                    try:
                        error_body = response_body
                        if isinstance(error_body, dict):
                            # Try to extract error message from common error response formats
                            extracted_error = (error_body.get('error') or 
                                             error_body.get('message') or 
                                             error_body.get('detail') or 
                                             str(error_body))
                            error_msg = f'HTTP {response.status_code}: {extracted_error}'
                    except:
                        pass
            elif not final_success:
                # Success criteria failure
                error_msg = success_error_msg
                        
            self._log_api_call(
                workflow_execution, workflow_rule, rule_execution,
                action.name, connector.name, action.http_method, url,
                headers, params, json_data or {},
                status_type, response.status_code, 
                dict(response.headers), response_body, error_msg,
                request_timestamp, response_timestamp, response_time_ms,
                True, []
            )
            
            result = {
                'success': final_success,
                'http_success': http_success,
                'status_code': response.status_code,
                'response_time_ms': response_time_ms,
                'headers': dict(response.headers),
                'body': response_body,
                'url': url,
                'error_message': error_msg,
                'custom_success_evaluated': action.enable_custom_success_logic and bool(action.success_criteria),
                'request_details': {
                    'method': action.http_method,
                    'url': url,
                    'headers': headers,
                    'params': params,
                    'body': json_data,
                }
            }
            
            # Add error information for failures
            if not final_success:
                result['error'] = error_msg
                        
            return result
            
        except requests.exceptions.Timeout as e:
            # Log timeout error
            self._log_api_call(
                workflow_execution, workflow_rule, rule_execution,
                action.name, connector.name, action.http_method,
                url if 'url' in locals() else '',
                headers if 'headers' in locals() else {}, 
                params if 'params' in locals() else {}, 
                json_data if 'json_data' in locals() else {},
                'timeout', None, {}, {}, 
                f'Request timeout after {self.timeout} seconds',
                request_timestamp, timezone.now(), 
                int((time.time() - start_time) * 1000),
                True, []
            )
            return {
                'success': False,
                'error': f'Request timeout after {self.timeout} seconds',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'timeout',
                'error_details': str(e),
                'url': url if 'url' in locals() else None,
            }
        except requests.exceptions.ConnectionError as e:
            # Log connection error
            self._log_api_call(
                workflow_execution, workflow_rule, rule_execution,
                action.name, connector.name, action.http_method,
                url if 'url' in locals() else '',
                headers if 'headers' in locals() else {}, 
                params if 'params' in locals() else {}, 
                json_data if 'json_data' in locals() else {},
                'network_error', None, {}, {}, 
                'Connection error - unable to reach the server',
                request_timestamp, timezone.now(), 
                int((time.time() - start_time) * 1000),
                True, []
            )
            return {
                'success': False,
                'error': 'Connection error - unable to reach the server',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'connection_error',
                'error_details': str(e),
                'url': url if 'url' in locals() else None,
                'possible_causes': [
                    'Server is down or unreachable',
                    'Invalid URL or hostname',
                    'Network connectivity issues',
                    'Firewall blocking the request'
                ]
            }
        except requests.exceptions.HTTPError as e:
            # Log HTTP error
            self._log_api_call(
                workflow_execution, workflow_rule, rule_execution,
                action.name, connector.name, action.http_method,
                url if 'url' in locals() else '',
                headers if 'headers' in locals() else {}, 
                params if 'params' in locals() else {}, 
                json_data if 'json_data' in locals() else {},
                'failed', None, {}, {}, 
                f'HTTP error: {str(e)}',
                request_timestamp, timezone.now(), 
                int((time.time() - start_time) * 1000),
                True, []
            )
            return {
                'success': False,
                'error': f'HTTP error: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'http_error',
                'error_details': str(e),
                'url': url if 'url' in locals() else None,
            }
        except requests.exceptions.RequestException as e:
            # Log request exception
            self._log_api_call(
                workflow_execution, workflow_rule, rule_execution,
                action.name, connector.name, action.http_method,
                url if 'url' in locals() else '',
                headers if 'headers' in locals() else {}, 
                params if 'params' in locals() else {}, 
                json_data if 'json_data' in locals() else {},
                'failed', None, {}, {}, 
                f'Request failed: {str(e)}',
                request_timestamp, timezone.now(), 
                int((time.time() - start_time) * 1000),
                True, []
            )
            return {
                'success': False,
                'error': f'Request failed: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'request_exception',
                'error_details': str(e),
                'url': url if 'url' in locals() else None,
            }
        except Exception as e:
            # Log unexpected error
            self._log_api_call(
                workflow_execution, workflow_rule, rule_execution,
                action.name, connector.name, action.http_method,
                url if 'url' in locals() else '',
                headers if 'headers' in locals() else {}, 
                params if 'params' in locals() else {}, 
                json_data if 'json_data' in locals() else {},
                'failed', None, {}, {}, 
                f'Unexpected error: {str(e)}',
                request_timestamp, timezone.now(), 
                int((time.time() - start_time) * 1000),
                False, []
            )
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'unexpected_error',
                'error_details': str(e),
                'url': url if 'url' in locals() else None,
            }

    def test_connection(self, connector, action=None, custom_params=None, custom_headers=None, custom_body=None):
        """Test a connector connection and save the result"""
        # If no specific action provided, use the first action or create a simple GET test
        if not action:
            if connector.actions.exists():
                action = connector.actions.first()
            else:
                # Create a temporary action for basic connectivity test
                from .models import ConnectorAction
                action = ConnectorAction(
                    connector=connector,
                    name='connectivity_test',
                    http_method='GET',
                    endpoint_path='',
                )
        
        # Execute the action
        result = self.execute_action(connector, action, custom_params, custom_headers, custom_body)
        
        # Create test record
        test = ConnectionTest.objects.create(
            connector=connector,
            action=action if action.id else None,
            status='success' if result['success'] else 'failed',
            response_status_code=result.get('status_code'),
            response_time_ms=result.get('response_time_ms'),
            response_body=str(result.get('body', ''))[:5000],  # Limit response body size
            error_message=result.get('error', '') if not result['success'] else '',
        )
        
        # Return comprehensive test result
        test_result = {
            'test_id': test.id,
            'success': result['success'],
            'status_code': result.get('status_code'),
            'response_time_ms': result.get('response_time_ms'),
            'error': result.get('error'),
            'response_preview': str(result.get('body', ''))[:200] + '...' if len(str(result.get('body', ''))) > 200 else str(result.get('body', '')),
        }
        
        # Add additional debugging information
        if 'url' in result:
            test_result['url'] = result['url']
        if 'headers' in result:
            test_result['headers'] = result['headers']
        if 'body' in result:
            test_result['body'] = result['body']
        if 'request_details' in result:
            test_result['request_details'] = result['request_details']
        if 'error_type' in result:
            test_result['error_type'] = result['error_type']
        if 'error_details' in result:
            test_result['error_details'] = result['error_details']
        if 'possible_causes' in result:
            test_result['possible_causes'] = result['possible_causes']
            
        return test_result

    def _safe_json_decode(self, text):
        """Safely decode JSON response"""
        try:
            import json
            return json.loads(text)
        except (json.JSONDecodeError, ValueError):
            return text  # Return as string if not valid JSON

    def _log_api_call(self, workflow_execution, workflow_rule, rule_execution,
                      action_name, connector_name, http_method, endpoint_url,
                      request_headers, request_params, request_body,
                      status, http_status_code, response_headers, response_body, error_message,
                      request_timestamp, response_timestamp, duration_ms,
                      api_called, validation_errors):
        """Log API call details to the database"""
        try:
            from workflows.models import ApiCallLog
            
            ApiCallLog.objects.create(
                workflow_execution=workflow_execution,
                workflow_rule=workflow_rule, 
                rule_execution=rule_execution,
                action_name=action_name,
                connector_name=connector_name,
                http_method=http_method,
                endpoint_url=endpoint_url,
                request_headers=request_headers,
                request_params=request_params,
                request_body=request_body,
                status=status,
                http_status_code=http_status_code,
                response_headers=response_headers,
                response_body=response_body,
                error_message=error_message,
                request_timestamp=request_timestamp,
                response_timestamp=response_timestamp,
                duration_ms=duration_ms,
                api_called=api_called,
                validation_errors=validation_errors
            )
        except Exception as e:
            # Don't let logging failures break the main flow
            print(f"WARNING: Failed to log API call: {str(e)}")
    
    def execute_async_action(self, connector, action, custom_params=None, custom_headers=None, 
                           custom_body=None, custom_body_params=None, custom_path_params=None, 
                           workflow_execution=None, workflow_rule=None, rule_execution=None):
        """
        Execute an async action. Returns execution ID for tracking.
        For polling-based actions, initiates the async operation and starts polling.
        For webhook-based actions, initiates the operation and sets up webhook listener.
        """
        if action.action_type != 'async':
            raise ValueError("Action must be of type 'async'")
        
        if action.async_type == 'polling':
            return self._execute_polling_action(
                connector, action, custom_params, custom_headers, custom_body,
                custom_body_params, custom_path_params, workflow_execution, workflow_rule, rule_execution
            )
        elif action.async_type == 'webhook':
            return self._execute_webhook_action(
                connector, action, custom_params, custom_headers, custom_body,
                custom_body_params, custom_path_params, workflow_execution, workflow_rule, rule_execution
            )
        else:
            raise ValueError(f"Unknown async_type: {action.async_type}")
    
    def _execute_polling_action(self, connector, action, custom_params=None, custom_headers=None,
                               custom_body=None, custom_body_params=None, custom_path_params=None,
                               workflow_execution=None, workflow_rule=None, rule_execution=None):
        """Execute polling-based async action (existing logic)"""
        # Generate unique execution ID
        execution_id = str(uuid.uuid4())
        
        # Create async execution tracking record first
        async_execution = AsyncActionExecution.objects.create(
            action=action,
            execution_id=execution_id,
            initial_request_params={
                'path_params': custom_path_params or {},
                'query_params': custom_params or {},
                'headers': custom_headers or {},
                'body_params': custom_body_params or {},
                'body': custom_body or {}
            },
            workflow_execution_id=workflow_execution.id if workflow_execution else None,
            workflow_rule_id=workflow_rule.id if workflow_rule else None,
            status='initiated'
        )
        
        # Create progress entry for initial API call
        initial_url = self.build_url(connector, action, custom_path_params)
        initial_headers = action.headers.copy() if action.headers else {}
        if custom_headers:
            initial_headers.update(custom_headers)
        initial_params = action.query_params.copy() if action.query_params else {}
        if custom_params:
            initial_params.update(custom_params)
        initial_body = {}
        if action.http_method in ['POST', 'PUT', 'PATCH']:
            # Priority: custom_body (direct JSON) > custom_body_params (template-based) > default
            if custom_body is not None:
                # Use custom_body directly - this is raw JSON to send as-is
                initial_body = custom_body
            elif custom_body_params is not None:
                initial_body = self.build_request_body(action, custom_body_params)
            else:
                initial_body = action.request_body.copy() if action.request_body else {}
        
        progress_entry = self._create_progress_entry(
            async_execution, 'initial', initial_url, action.http_method,
            request_headers=initial_headers, request_params=initial_params, request_body=initial_body
        )
        
        # Execute the initial API call to start the async operation
        initial_result = self.execute_action(
            connector, action, custom_params, custom_headers, custom_body, 
            custom_body_params, custom_path_params, workflow_execution, workflow_rule, rule_execution
        )
        
        # Complete the progress entry with results
        self._complete_progress_entry(
            progress_entry,
            initial_result.get('status_code', 0),
            initial_result.get('response_time_ms', 0),
            initial_result.get('headers', {}),
            initial_result.get('body', {}),
            'success' if initial_result.get('success') else 'failed',
            initial_result.get('error') or None
        )
        
        # Update async execution with initial response
        async_execution.initial_response = initial_result.get('body', {})
        async_execution.initial_response_status = initial_result.get('status_code')
        async_execution.status = 'initiated' if initial_result.get('success') else 'failed'
        async_execution.save()
        
        # If initial call failed, return error
        if not initial_result.get('success'):
            async_execution.status = 'failed'
            async_execution.error_message = initial_result.get('error', 'Initial API call failed')
            async_execution.save()
            return {
                'success': False,
                'execution_id': execution_id,
                'error': 'Initial API call failed',
                'details': initial_result
            }
        
        # Start polling
        self._start_polling(async_execution, workflow_execution, workflow_rule, rule_execution)
        
        return {
            'success': True,
            'execution_id': execution_id,
            'status': async_execution.status,
            'initial_response': initial_result
        }
    
    def _execute_webhook_action(self, connector, action, custom_params=None, custom_headers=None,
                               custom_body=None, custom_body_params=None, custom_path_params=None,
                               workflow_execution=None, workflow_rule=None, rule_execution=None):
        """Execute webhook-based async action"""
        from .webhook_service import WebhookService
        webhook_service = WebhookService()
        
        # Generate unique execution ID
        execution_id = str(uuid.uuid4())
        
        # Create async execution tracking record
        async_execution = AsyncActionExecution.objects.create(
            action=action,
            execution_id=execution_id,
            initial_request_params={
                'path_params': custom_path_params or {},
                'query_params': custom_params or {},
                'headers': custom_headers or {},
                'body_params': custom_body_params or {},
                'body': custom_body or {}
            },
            workflow_execution_id=workflow_execution.id if workflow_execution else None,
            workflow_rule_id=workflow_rule.id if workflow_rule else None,
            status='initiated'
        )
        
        # Generate webhook URL
        webhook_url = webhook_service.generate_webhook_url(async_execution, action.webhook_type)
        async_execution.webhook_url = webhook_url
        
        # Inject webhook URL into request parameters
        custom_params_copy = (custom_params or {}).copy()
        custom_headers_copy = (custom_headers or {}).copy()
        custom_body_params_copy = (custom_body_params or {}).copy()
        custom_path_params_copy = (custom_path_params or {}).copy()
        
        updated_params, updated_headers, updated_body_params, updated_path_params = webhook_service.inject_webhook_url(
            action, webhook_url, custom_params_copy, custom_headers_copy, 
            custom_body_params_copy, custom_path_params_copy
        )
        
        # Create progress entry for initial API call
        initial_url = self.build_url(connector, action, updated_path_params)
        initial_headers = action.headers.copy() if action.headers else {}
        initial_headers.update(updated_headers)
        initial_params = action.query_params.copy() if action.query_params else {}
        initial_params.update(updated_params)
        initial_body = {}
        if action.http_method in ['POST', 'PUT', 'PATCH']:
            # Priority: custom_body (direct JSON) > updated_body_params (template-based) > default
            if custom_body is not None:
                # Use custom_body directly - this is raw JSON to send as-is
                initial_body = custom_body
            elif updated_body_params:
                initial_body = self.build_request_body(action, updated_body_params)
            else:
                initial_body = action.request_body.copy() if action.request_body else {}
        
        progress_entry = self._create_progress_entry(
            async_execution, 'initial', initial_url, action.http_method,
            request_headers=initial_headers, request_params=initial_params, request_body=initial_body
        )
        
        # Execute the initial API call with webhook URL injected
        initial_result = self.execute_action(
            connector, action, updated_params, updated_headers, custom_body,
            updated_body_params, updated_path_params, workflow_execution, workflow_rule, rule_execution
        )
        
        # Complete the progress entry with results
        self._complete_progress_entry(
            progress_entry,
            initial_result.get('status_code', 0),
            initial_result.get('response_time_ms', 0),
            initial_result.get('headers', {}),
            initial_result.get('body', {}),
            'success' if initial_result.get('success') else 'failed',
            initial_result.get('error') or None
        )
        
        # Update async execution with initial response
        async_execution.initial_response = initial_result.get('body', {})
        async_execution.initial_response_status = initial_result.get('status_code')
        
        # If initial call failed, return error
        if not initial_result.get('success'):
            async_execution.status = 'failed'
            async_execution.error_message = initial_result.get('error', 'Initial API call failed')
            async_execution.save()
            return {
                'success': False,
                'execution_id': execution_id,
                'error': 'Initial API call failed',
                'details': initial_result
            }
        
        # For static webhooks, extract and store identifier
        if action.webhook_type == 'static':
            identifier = webhook_service.extract_webhook_identifier(action, initial_result.get('body', {}))
            async_execution.webhook_identifier = identifier
        
        # Set up webhook monitoring
        async_execution.status = 'initiated'
        async_execution.save()
        
        # Schedule timeout monitoring
        self._schedule_webhook_timeout(async_execution, action.webhook_timeout_seconds)
        
        return {
            'success': True,
            'execution_id': execution_id,
            'status': async_execution.status,
            'webhook_url': webhook_url,
            'initial_response': initial_result
        }
    
    def _start_polling(self, async_execution, workflow_execution=None, workflow_rule=None, rule_execution=None):
        """Start the polling process for an async action"""
        action = async_execution.action
        
        # Extract parameters from initial response for polling
        polling_params = self._extract_polling_params(
            async_execution.initial_response, 
            action.response_to_polling_mapping
        )
        
        # Update status to polling
        async_execution.status = 'polling'
        async_execution.save()
        
        # In a real implementation, you would schedule this with Celery or similar
        # For now, we'll implement synchronous polling with a simple loop
        self._perform_polling(async_execution, polling_params, workflow_execution, workflow_rule, rule_execution)
    
    def _extract_polling_params(self, initial_response, mapping_config):
        """Extract parameters from initial response to use in polling requests"""
        polling_params = {
            'path': {},
            'query': {},
            'header': {},
            'body': {}
        }
        
        if not mapping_config or not initial_response:
            return polling_params
        
        for response_path, mapping in mapping_config.items():
            target_type = mapping.get('target_type')  # 'path', 'query', 'header', 'body'
            target_param = mapping.get('target_param')
            json_path = mapping.get('json_path', response_path)
            
            if not target_type or not target_param:
                continue
            
            # Extract value from response using JSON path
            value = self._extract_json_path_value(initial_response, json_path)
            if value is not None:
                if target_type in polling_params:
                    polling_params[target_type][target_param] = value
        
        return polling_params
    
    def _extract_json_path_value(self, data, path):
        """Extract value from JSON data using dot notation path"""
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif isinstance(value, list) and key.isdigit():
                    value = value[int(key)]
                else:
                    return None
            return value
        except:
            return None
    
    def _perform_polling(self, async_execution, polling_params, workflow_execution=None, workflow_rule=None, rule_execution=None):
        """Perform polling until success/failure criteria are met or max attempts reached"""
        action = async_execution.action
        connector = action.connector
        max_attempts = action.max_polling_attempts
        frequency_seconds = action.polling_frequency_seconds
        
        for attempt in range(1, max_attempts + 1):
            async_execution.polling_attempts = attempt
            async_execution.save()
            
            # Wait before polling (except for first attempt)
            if attempt > 1:
                time.sleep(frequency_seconds)
            
            # Create progress entry for this polling attempt
            polling_url = self._build_polling_url(connector, action, polling_params.get('path', {}))
            polling_headers = action.polling_headers.copy() if action.polling_headers else {}
            if polling_params.get('header'):
                polling_headers.update(polling_params['header'])
            polling_query_params = action.polling_query_params.copy() if action.polling_query_params else {}
            if polling_params.get('query'):
                polling_query_params.update(polling_params['query'])
            polling_body = {}
            if action.polling_http_method in ['POST', 'PUT', 'PATCH']:
                polling_body = action.polling_request_body.copy() if action.polling_request_body else {}
                if polling_params.get('body'):
                    polling_body.update(polling_params['body'])
            
            progress_entry = self._create_progress_entry(
                async_execution, 'polling', polling_url, action.polling_http_method,
                attempt_number=attempt,
                request_headers=polling_headers, 
                request_params=polling_query_params,
                request_body=polling_body
            )
            
            # Perform polling request (pass workflow context for logging)
            polling_result = self._execute_polling_request(
                connector, action, polling_params,
                workflow_execution=workflow_execution,
                workflow_rule=workflow_rule,
                rule_execution=rule_execution
            )
            
            # Complete the progress entry with results
            self._complete_progress_entry(
                progress_entry,
                polling_result.get('status_code', 0),
                0,  # response_time_ms will be calculated in _execute_polling_request
                polling_result.get('headers', {}),
                polling_result.get('body', {}),
                'success' if polling_result.get('success') else 'failed',
                polling_result.get('error') or None
            )
            
            # Update execution record with polling result
            async_execution.last_polling_response = polling_result.get('body', {})
            async_execution.last_polling_status = polling_result.get('status_code')
            async_execution.last_polled_at = timezone.now()
            
            if not polling_result.get('success'):
                # Polling request failed - continue trying unless it's the last attempt
                if attempt == max_attempts:
                    async_execution.status = 'failed'
                    async_execution.error_message = f'Polling failed after {max_attempts} attempts: {polling_result.get("error")}'
                    async_execution.completed_at = timezone.now()
                    async_execution.save()
                    break
                continue
            
            # Check success/failure criteria
            response_data = polling_result.get('body', {})
            
            # Check success criteria
            if action.async_success_criteria:
                success_met, success_msg = self._evaluate_success_criteria(
                    action.async_success_criteria, response_data
                )
                if success_met:
                    async_execution.status = 'completed'
                    async_execution.final_response = response_data
                    async_execution.completed_at = timezone.now()
                    async_execution.save()
                    
                    # Create completion progress entry
                    completion_entry = self._create_progress_entry(
                        async_execution, 'completion', polling_url, 'N/A',
                        attempt_number=attempt
                    )
                    self._complete_progress_entry(
                        completion_entry, 200, 0, {}, {}, 'success', None, 
                        f'Success criteria met: {success_msg}'
                    )
                    
                    # Notify rule engine of completion
                    self._notify_async_completion(async_execution)
                    break
            
            # Check failure criteria
            if action.async_failure_criteria:
                failure_met, failure_msg = self._evaluate_success_criteria(
                    action.async_failure_criteria, response_data
                )
                if failure_met:
                    async_execution.status = 'failed'
                    async_execution.error_message = f'Failure criteria met: {failure_msg}'
                    async_execution.completed_at = timezone.now()
                    async_execution.save()
                    
                    # Create failure progress entry
                    failure_entry = self._create_progress_entry(
                        async_execution, 'failure', polling_url, 'N/A',
                        attempt_number=attempt
                    )
                    self._complete_progress_entry(
                        failure_entry, 200, 0, {}, {}, 'failed', failure_msg,
                        f'Failure criteria met: {failure_msg}'
                    )
                    
                    # Notify rule engine of completion (even for failures)
                    self._notify_async_completion(async_execution)
                    break
            
            async_execution.save()
            
            # If we've reached max attempts without success/failure criteria being met
            if attempt == max_attempts:
                async_execution.status = 'timeout'
                async_execution.error_message = f'Polling timeout after {max_attempts} attempts'
                async_execution.completed_at = timezone.now()
                async_execution.save()
                
                # Create timeout progress entry
                timeout_entry = self._create_progress_entry(
                    async_execution, 'timeout', polling_url, 'N/A',
                    attempt_number=max_attempts
                )
                self._complete_progress_entry(
                    timeout_entry, 0, 0, {}, {}, 'failed', 
                    f'Polling timeout after {max_attempts} attempts',
                    f'Maximum polling attempts ({max_attempts}) reached without meeting success/failure criteria'
                )
    
    def _execute_polling_request(self, connector, action, polling_params, workflow_execution=None, workflow_rule=None, rule_execution=None):
        """Execute a polling request using the polling endpoint configuration"""
        try:
            # Build polling URL
            polling_url = self._build_polling_url(connector, action, polling_params.get('path', {}))
            
            # Prepare polling headers
            polling_headers = action.polling_headers.copy() if action.polling_headers else {}
            if polling_params.get('header'):
                polling_headers.update(polling_params['header'])
            
            # Add authentication headers
            auth, auth_headers = self.prepare_auth(connector.credential)
            polling_headers.update(auth_headers)
            
            # Prepare polling query parameters
            polling_query_params = action.polling_query_params.copy() if action.polling_query_params else {}
            if polling_params.get('query'):
                polling_query_params.update(polling_params['query'])
            
            # Prepare polling request body
            polling_body = None
            if action.polling_http_method in ['POST', 'PUT', 'PATCH']:
                polling_body = action.polling_request_body.copy() if action.polling_request_body else {}
                if polling_params.get('body'):
                    polling_body.update(polling_params['body'])
            
            # Make polling request
            import time
            start_time = time.time()
            
            response = requests.request(
                method=action.polling_http_method,
                url=polling_url,
                params=polling_query_params,
                headers=polling_headers,
                json=polling_body if polling_body else None,
                auth=auth,
                timeout=self.timeout
            )
            
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            # Process response
            http_success = 200 <= response.status_code < 300
            response_body = self._safe_json_decode(response.text)
            
            result = {
                'success': http_success,
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'body': response_body,
                'error': f'HTTP {response.status_code}: {response.reason}' if not http_success else None
            }
            
            # Log polling API call directly to database
            try:
                from workflows.models import ApiCallLog
                
                ApiCallLog.objects.create(
                    workflow_execution_id=workflow_execution.id if workflow_execution else None,
                    workflow_rule_id=workflow_rule.id if workflow_rule else None,
                    rule_execution_id=rule_execution.id if rule_execution else None,
                    action_name=f"{action.name} (Polling)",
                    connector_name=connector.name,
                    http_method=action.polling_http_method,
                    endpoint_url=polling_url,
                    request_headers=polling_headers,
                    request_params=polling_query_params,
                    request_body=polling_body or {},
                    status='success' if result['success'] else 'failed',
                    http_status_code=response.status_code,
                    response_headers=dict(response.headers),
                    response_body=response_body,
                    error_message=result.get('error') or '',
                    request_timestamp=timezone.now() - timezone.timedelta(milliseconds=response_time_ms),
                    response_timestamp=timezone.now(),
                    duration_ms=response_time_ms,
                    api_called=True,
                    validation_errors=[]
                )
            except Exception as e:
                print(f"DIRECT LOG ERROR: {str(e)}")
            
            return result
            
        except Exception as e:
            end_time = time.time()
            response_time_ms = int((end_time - start_time) * 1000)
            
            error_result = {
                'success': False,
                'error': f'Polling request failed: {str(e)}',
                'error_type': 'polling_error'
            }
            
            # Log failed polling API call
            print(f"DEBUG: About to log failed polling call for {action.name}: {str(e)}")
            try:
                self._log_api_call(
                    workflow_execution, workflow_rule, rule_execution,
                    f"{action.name} (Polling)", connector.name, action.polling_http_method,
                    polling_url if 'polling_url' in locals() else '',
                    polling_headers if 'polling_headers' in locals() else {},
                    polling_query_params if 'polling_query_params' in locals() else {},
                    polling_body if 'polling_body' in locals() else {},
                    'failed', 0, {}, {}, str(e),
                    timezone.now() - timezone.timedelta(milliseconds=response_time_ms), timezone.now(), response_time_ms,
                    False, []
                )
                print(f"DEBUG: Successfully logged failed polling call")
            except Exception as log_e:
                print(f"ERROR: Failed to log failed polling call: {str(log_e)}")
                import traceback
                traceback.print_exc()
            
            return error_result
    
    def _build_polling_url(self, connector, action, path_params):
        """Build polling URL with path parameter substitution"""
        base_url = connector.base_url.rstrip('/')
        polling_path = action.polling_endpoint_path.lstrip('/')
        
        # Merge default polling path params with extracted params
        final_path_params = action.polling_path_params.copy() if action.polling_path_params else {}
        final_path_params.update(path_params)
        
        # Process path parameters
        processed_path = self._process_path_template(polling_path, final_path_params)
        return f"{base_url}/{processed_path}" if processed_path else base_url
    
    def _schedule_webhook_timeout(self, async_execution, timeout_seconds):
        """Schedule timeout monitoring for webhook-based async actions"""
        # For now, we'll implement a simple approach
        # In production, you might want to use Celery or similar task queue
        import threading
        import time
        
        def timeout_handler():
            time.sleep(timeout_seconds)
            
            # Check if execution is still pending
            try:
                async_execution.refresh_from_db()
                if async_execution.status in ['initiated', 'polling'] and not async_execution.webhook_received:
                    async_execution.status = 'timeout'
                    async_execution.error_message = f'Webhook timeout after {timeout_seconds} seconds'
                    async_execution.completed_at = timezone.now()
                    async_execution.save()
                    
                    logger.info(f"Webhook execution {async_execution.execution_id} timed out")
                    
                    # Optionally notify rule engine of timeout
                    from .webhook_service import WebhookService
                    webhook_service = WebhookService()
                    webhook_service._notify_async_completion(async_execution)
                    
            except Exception as e:
                logger.error(f"Error in webhook timeout handler: {e}")
        
        # Start timeout monitoring in background
        timeout_thread = threading.Thread(target=timeout_handler, daemon=True)
        timeout_thread.start()
        
        logger.info(f"Scheduled webhook timeout for execution {async_execution.execution_id} in {timeout_seconds} seconds")
    
    def get_async_execution_status(self, execution_id):
        """Get the current status of an async execution"""
        try:
            async_execution = AsyncActionExecution.objects.get(execution_id=execution_id)
            return {
                'execution_id': execution_id,
                'status': async_execution.status,
                'polling_attempts': async_execution.polling_attempts,
                'initial_response': async_execution.initial_response,
                'last_polling_response': async_execution.last_polling_response,
                'final_response': async_execution.final_response,
                'error_message': async_execution.error_message,
                'created_at': async_execution.created_at,
                'completed_at': async_execution.completed_at,
                'last_polled_at': async_execution.last_polled_at
            }
        except AsyncActionExecution.DoesNotExist:
            return {
                'execution_id': execution_id,
                'error': 'Execution not found'
            }
        except Exception as e:
            logger.error(f"Error retrieving async execution status: {e}")
            return {'status': 'error', 'error': str(e)}

    def _notify_async_completion(self, async_execution):
        """Notify rule engine when async execution completes."""
        try:
            if async_execution.workflow_execution_id:
                from workflows.rule_engine_service import RuleEngineService
                rule_engine = RuleEngineService()
                rule_engine.handle_async_completion(async_execution.execution_id)
        except Exception as e:
            logger.error(f"Error notifying rule engine of async completion: {e}")