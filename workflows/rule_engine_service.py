import time
import re
from typing import Dict, Any, List
from datetime import datetime


class SimpleRuleEngine:
    """
    Simplified rule engine for testing workflow integration.
    This will be replaced with actual Leegality Rule Engine integration.
    """
    
    def __init__(self):
        self.context = {}
    
    def execute_rule(self, rule_definition: str, context_data: Dict[str, Any], 
                    workflow_execution=None, workflow_rule=None, rule_execution=None) -> Dict[str, Any]:
        """
        Execute a rule definition with given context data.
        Returns execution result with success/error status.
        """
        start_time = time.time()
        
        try:
            self.context = context_data
            # Store logging context for action calls
            self.current_workflow_execution = workflow_execution
            self.current_workflow_rule = workflow_rule
            self.current_rule_execution = rule_execution
            
            result = self._parse_and_execute(rule_definition)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Check if rule execution had errors
            has_errors = result.get('errors', [])
            success_status = len(has_errors) == 0
            
            return {
                'success': success_status,
                'result': result,
                'execution_time_ms': execution_time,
                'context_data': context_data,
                'assignments': result.get('assignments', {}),
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', [])
            }
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'error': str(e),
                'execution_time_ms': execution_time,
                'context_data': context_data
            }
    
    def _parse_and_execute(self, rule_definition: str) -> Dict[str, Any]:
        """
        Parse and execute the rule definition.
        This is a simplified implementation for testing.
        """
        result = {
            'assignments': {},
            'errors': [],
            'warnings': []
        }
        
        if not rule_definition or not rule_definition.strip():
            result['errors'].append("Empty rule definition")
            return result
        
        # Remove comments and normalize whitespace
        lines = [line.strip() for line in rule_definition.split('\n') if line.strip() and not line.strip().startswith('//')]
        rule_text = ' '.join(lines)
        
        # Simple rule patterns
        if_pattern = r'if\s*\(\s*(.+?)\s*\)\s*\{(.*?)\}'
        for_pattern = r'for\s*\(\s*(.+?)\s+in\s+(.+?)\s*\)\s*\{(.*)\}'
        assign_pattern = r'assign\s+(.+?)\s*=\s*(.+?)(?:;|$)'
        error_pattern = r'error\s+"([^"]+)"'
        action_pattern = r'call\s+action\s+"([^"]+)"\s+from\s+connector\s+"([^"]+)"\s+with\s*\{((?:[^{}]|\{\{[^}]*\}\}|\{[^}]*\})*)\}\s*map\s+response\s*\{((?:[^{}]|\{\{[^}]*\}\}|\{[^}]*\})*)\}'
        
        # Process FOR statements with better parsing
        # Track processed spans to avoid double processing by IF statements
        processed_spans = []
        
        for_matches = re.finditer(for_pattern, rule_text, re.IGNORECASE | re.DOTALL)
        for match in for_matches:
            loop_var = match.group(1).strip()
            collection_expr = match.group(2).strip()
            body = match.group(3).strip()
            
            # Track this span as processed
            processed_spans.append((match.start(), match.end()))
            
            # Clean up the body - just normalize whitespace
            body = body.strip()
            
            self._execute_for_loop(loop_var, collection_expr, body, result)
        
        # Process ACTION calls
        action_matches = re.finditer(action_pattern, rule_text, re.IGNORECASE | re.DOTALL)
        print(f"DEBUG: Looking for action calls in rule_text: {repr(rule_text)}")
        
        action_found = False
        for match in action_matches:
            action_found = True
            action_name = match.group(1).strip()
            connector_name = match.group(2).strip()
            params_str = match.group(3).strip()
            mappings_str = match.group(4).strip()
            
            print(f"DEBUG: Found action call - Action: '{action_name}', Connector: '{connector_name}'")
            print(f"DEBUG: Params: '{params_str}', Mappings: '{mappings_str}'")
            
            # Track this span as processed
            processed_spans.append((match.start(), match.end()))
            
            # Execute action and update context dynamically
            action_result = self._execute_action_call(action_name, connector_name, params_str, mappings_str, result)
            
            # Update context with any new assignments for subsequent actions
            context_updated = False
            
            # Update with regular assignments
            if action_result and 'assignments' in result and result['assignments']:
                print(f"DEBUG: Updating context with new assignments: {result['assignments']}")
                for key, value in result['assignments'].items():
                    self.context[key] = value
                context_updated = True
            
            # Update with temporary assignments
            if action_result and 'temp_assignments' in result and result['temp_assignments']:
                print(f"DEBUG: Updating context with temporary assignments: {result['temp_assignments']}")
                for key, value in result['temp_assignments'].items():
                    self.context[key] = value
                context_updated = True
            
            if context_updated:
                print(f"DEBUG: Updated context now contains: {list(self.context.keys())}")
                print(f"DEBUG: Full updated context: {self.context}")
            else:
                print(f"DEBUG: No assignments to update context with. action_result={bool(action_result)}, assignments={result.get('assignments', {})}, temp_assignments={result.get('temp_assignments', {})}")
        
        if not action_found:
            print(f"DEBUG: No action calls found in rule")
            # Add a log entry indicating no action was found
            if 'action_logs' not in result:
                result['action_logs'] = []
            result['action_logs'].append({
                'action_name': 'No Action Found',
                'connector_name': 'N/A',
                'status': 'not_found',
                'params': {},
                'response': {},
                'error': f'No action call pattern matched in rule: {rule_text[:200]}...',
                'api_called': False
            })
        
        # Process IF statements (skip spans already processed as FOR statements)
        if_matches = re.finditer(if_pattern, rule_text, re.IGNORECASE | re.DOTALL)
        for match in if_matches:
            # Check if this match overlaps with any processed FOR statement
            match_start, match_end = match.start(), match.end()
            overlaps = any(start <= match_start < end or start < match_end <= end 
                          for start, end in processed_spans)
            
            if not overlaps:
                condition = match.group(1)
                body = match.group(2)
                
                if self._evaluate_condition(condition):
                    self._execute_body(body, result)
        
        # Process standalone assignments (skip spans already processed as FOR statements)  
        assign_matches = re.finditer(assign_pattern, rule_text, re.IGNORECASE)
        for match in assign_matches:
            # Check if this assignment is inside a processed FOR statement
            match_start, match_end = match.start(), match.end()
            overlaps = any(start <= match_start < end for start, end in processed_spans)
            
            if not overlaps and not self._is_inside_if_block(match.start(), rule_text):
                var_name = match.group(1).strip()
                var_value = match.group(2).strip().strip('"\'')
                result['assignments'][var_name] = self._resolve_value(var_value)
        
        # Process standalone errors
        error_matches = re.finditer(error_pattern, rule_text, re.IGNORECASE)
        for match in error_matches:
            if not self._is_inside_if_block(match.start(), rule_text):
                result['errors'].append(match.group(1))
        
        # Check for unrecognized syntax
        if not processed_spans and not any(re.finditer(pattern, rule_text, re.IGNORECASE) 
                                          for pattern in [if_pattern, assign_pattern, error_pattern]):
            result['errors'].append(f"Unrecognized rule syntax: {rule_text[:100]}...")
        
        return result
    
    def _evaluate_condition(self, condition: str) -> bool:
        """Evaluate a condition string"""
        try:
            # Replace attribute placeholders with actual values
            resolved_condition = self._resolve_attributes(condition)
            
            # Simple condition evaluation
            # Support basic comparisons: ==, !=, <, >, <=, >=
            operators = ['==', '!=', '<=', '>=', '<', '>']
            
            for op in operators:
                if op in resolved_condition:
                    left, right = resolved_condition.split(op, 1)
                    left_val = self._resolve_value(left.strip())
                    right_val = self._resolve_value(right.strip())
                    
                    if op == '==':
                        return left_val == right_val
                    elif op == '!=':
                        return left_val != right_val
                    elif op == '<':
                        return left_val < right_val
                    elif op == '>':
                        return left_val > right_val
                    elif op == '<=':
                        return left_val <= right_val
                    elif op == '>=':
                        return left_val >= right_val
            
            # Check for null conditions
            if 'is_null' in resolved_condition.lower():
                attr = resolved_condition.lower().replace('is_null', '').strip()
                value = self._resolve_value(attr)
                return value is None or value == ''
            
            # Default to true for testing
            return True
            
        except Exception:
            return False
    
    def _execute_for_loop(self, loop_var: str, collection_expr: str, body: str, result: Dict[str, Any]):
        """Execute a for loop over a collection"""
        try:
            # Resolve the collection expression
            collection = self._resolve_value(collection_expr)
            
            # print(f"DEBUG: FOR loop - collection_expr: {collection_expr}, collection: {collection}, type: {type(collection)}")
            
            if not isinstance(collection, list):
                result['errors'].append(f"FOR loop collection must be a list, got {type(collection).__name__}")
                return
            
            # Save original context for restoration
            original_context = self.context.copy()
            
            # Execute loop body for each item in collection
            for index, item in enumerate(collection):
                # Create a temporary context with the loop variable
                loop_context = original_context.copy()
                
                # Handle document assignments specially
                if loop_var.startswith('@doc') and collection_expr == '{{documents}}':
                    # Set current document context for assignments
                    self._current_doc_index = index
                
                # Process assignments in loop body  
                # Split body by lines to handle multi-line properly
                for line in body.split('\n'):
                    line = line.strip()
                    if not line or line.startswith('//'):
                        continue
                    
                    # Match assignment pattern
                    assign_match = re.match(r'assign\s+(.+?)\s*=\s*(.+?)$', line, re.IGNORECASE)
                    if assign_match:
                        var_name = assign_match.group(1).strip()
                        var_value = assign_match.group(2).strip()
                        # Handle document field assignments
                        if var_name.startswith('@doc.') and 'documents' in self.context:
                            field_name = var_name.replace('@doc.', '')
                            resolved_value = self._resolve_value_in_context(var_value, item, index)
                            
                            # Update the actual document in context
                            if isinstance(self.context['documents'], list) and index < len(self.context['documents']):
                                if isinstance(self.context['documents'][index], dict):
                                    self.context['documents'][index][field_name] = resolved_value
                                    result['assignments'][f'documents[{index}].{field_name}'] = resolved_value
                        else:
                            # Regular variable assignment
                            resolved_value = self._resolve_value_in_context(var_value, item, index)
                            result['assignments'][var_name] = resolved_value
                    
                    # Handle errors  
                    error_match = re.match(r'error\s+"([^"]+)"', line, re.IGNORECASE)
                    if error_match:
                        error_msg = self._resolve_value_in_context(error_match.group(1), item, index)
                        result['errors'].append(error_msg)
                
                # All processing handled in the line loop above
            
            # Clean up
            if hasattr(self, '_current_doc_index'):
                delattr(self, '_current_doc_index')
                
        except Exception as e:
            result['errors'].append(f"FOR loop execution error: {str(e)}")
    
    def _execute_action_call(self, action_name: str, connector_name: str, params_str: str, mappings_str: str, result: Dict[str, Any]) -> bool:
        """Execute an action call and map the response (supports both sync and async actions)"""
        # Initialize parsed_params with safe defaults
        parsed_params = {
            'query_params': {},
            'headers': {},
            'body_params': {}
        }
        
        try:
            from connectors.models import Connector, ConnectorAction
            from connectors.services import ConnectorService
            
            # Find the connector and action
            try:
                connector = Connector.objects.get(name=connector_name)
                action = ConnectorAction.objects.get(connector=connector, name=action_name)
            except (Connector.DoesNotExist, ConnectorAction.DoesNotExist) as e:
                result['errors'].append(f"Action '{action_name}' in connector '{connector_name}' not found")
                return False
            
            # Parse parameters with enhanced structure support
            parsed_params = self._parse_enhanced_action_params(params_str)
            
            # Execute the action based on its type (sync or async)
            connector_service = ConnectorService()
            
            if action.action_type == 'async':
                # Execute async action
                action_result = connector_service.execute_async_action(
                    connector,
                    action,
                    custom_params=parsed_params.get('query_params'),
                    custom_headers=parsed_params.get('headers'),
                    custom_body=parsed_params.get('body'),
                    custom_body_params=parsed_params.get('body_params'),
                    custom_path_params=parsed_params.get('path_params'),
                    workflow_execution=getattr(self, 'current_workflow_execution', None),
                    workflow_rule=getattr(self, 'current_workflow_rule', None),
                    rule_execution=getattr(self, 'current_rule_execution', None)
                )
                
                # Log async action execution
                action_log = {
                    'action_name': action_name,
                    'connector_name': connector_name,
                    'action_type': 'async',
                    'async_type': action.async_type,
                    'execution_id': action_result.get('execution_id'),
                    'status': 'success' if action_result.get('success') else 'failed',
                    'params': parsed_params,
                    'response': action_result.get('initial_response', {}).get('body', {}),
                    'error': action_result.get('error'),
                    'full_result': action_result,
                    'api_called': True,
                    'async_status': action_result.get('status', 'unknown')
                }
                
                if 'action_logs' not in result:
                    result['action_logs'] = []
                result['action_logs'].append(action_log)
                
                print(f"DEBUG: Added async_executions to rule result: {action_result.get('execution_id')}")
                
                if action_result.get('success'):
                    # For async actions, we use the initial response for immediate mappings
                    # The polling results will be handled separately
                    initial_response = action_result.get('initial_response', {})
                    response_data = initial_response.get('body', {})
                    
                    # Store async execution ID for later tracking
                    if 'async_executions' not in result:
                        result['async_executions'] = []
                    result['async_executions'].append({
                        'execution_id': action_result.get('execution_id'),
                        'action_name': action_name,
                        'connector_name': connector_name,
                        'async_type': action.async_type,
                        'status': action_result.get('status')
                    })
                    
                    self._apply_response_mappings(mappings_str, response_data, result)
                    return True
                else:
                    result['errors'].append(f"Async action initialization failed: {action_result.get('error', 'Unknown error')}")
                    return False
            else:
                # Execute synchronous action (existing logic)
                print(f"DEBUG: About to call execute_action with:")
                print(f"  - custom_params (query_params): {parsed_params.get('query_params')}")
                print(f"  - custom_headers: {parsed_params.get('headers')}")
                print(f"  - custom_body: {parsed_params.get('body')}")
                print(f"  - custom_body_params: {parsed_params.get('body_params')}")
                print(f"  - custom_path_params: {parsed_params.get('path_params')}")

                action_result = connector_service.execute_action(
                    connector,
                    action,
                    custom_params=parsed_params.get('query_params'),
                    custom_headers=parsed_params.get('headers'),
                    custom_body=parsed_params.get('body'),
                    custom_body_params=parsed_params.get('body_params'),
                    custom_path_params=parsed_params.get('path_params'),
                    workflow_execution=getattr(self, 'current_workflow_execution', None),
                    workflow_rule=getattr(self, 'current_workflow_rule', None),
                    rule_execution=getattr(self, 'current_rule_execution', None)
                )
                
                print(f"DEBUG: Action execution result: {action_result}")
                
                # Log action execution with full details
                action_log = {
                    'action_name': action_name,
                    'connector_name': connector_name,
                    'action_type': 'sync',
                    'status': 'success' if action_result.get('success') else 'failed',
                    'params': parsed_params,
                    'response': action_result.get('body', {}),
                    'error': action_result.get('error'),
                    'full_result': action_result,  # Include full result for debugging
                    'api_called': True
                }
                
                if 'action_logs' not in result:
                    result['action_logs'] = []
                result['action_logs'].append(action_log)
                
                if action_result.get('success'):
                    # Parse response mappings and apply them
                    # ConnectorService returns response in 'body' field, not 'data'
                    response_data = action_result.get('body', {})
                    self._apply_response_mappings(mappings_str, response_data, result)
                    return True
                else:
                    result['errors'].append(f"Action call failed: {action_result.get('error', 'Unknown error')}")
                    return False
                
        except Exception as e:
            import traceback
            error_details = f"Action execution error: {str(e)}\nTraceback: {traceback.format_exc()}"
            print(f"DEBUG: {error_details}")
            result['errors'].append(f"Action execution error: {str(e)}")
            
            # Also add to action logs for debugging
            if 'action_logs' not in result:
                result['action_logs'] = []
            result['action_logs'].append({
                'action_name': action_name,
                'connector_name': connector_name,
                'status': 'failed',
                'params': parsed_params,
                'response': {},
                'error': str(e),
                'full_result': {'error': str(e), 'traceback': traceback.format_exc()},
                'api_called': False
            })
            return False
    
    def _parse_action_params(self, params_str: str) -> Dict[str, Any]:
        """Parse action parameters from JSON-like string"""
        params = {}
        try:
            import json
            import re
            
            print(f"DEBUG: Parsing params_str: {repr(params_str)}")
            
            # Clean up the parameters string
            params_str = params_str.strip()
            
            # First try to resolve any {{context}} references before parsing
            # Find all {{...}} patterns and resolve them
            def resolve_context_ref(match):
                attr_path = match.group(1)
                resolved = self._get_nested_value(attr_path)
                # Return as JSON-compatible string
                if isinstance(resolved, str):
                    return f'"{resolved}"'
                else:
                    return json.dumps(resolved)
            
            # Replace {{...}} with resolved values
            resolved_params_str = re.sub(r'\{\{([^}]+)\}\}', resolve_context_ref, params_str)
            print(f"DEBUG: After resolving context: {repr(resolved_params_str)}")
            
            # Try to parse as JSON
            # Wrap in braces if not already wrapped
            if not resolved_params_str.strip().startswith('{'):
                resolved_params_str = '{' + resolved_params_str + '}'
            
            params = json.loads(resolved_params_str)
            print(f"DEBUG: Parsed params: {params}")
            
        except Exception as e:
            print(f"DEBUG: Parameter parsing failed: {str(e)}")
            # Fallback to simple key:value parsing
            try:
                param_pairs = params_str.split(',')
                for pair in param_pairs:
                    if ':' in pair:
                        key, value = pair.split(':', 1)
                        key = key.strip().strip('"\'')
                        value = value.strip()
                        
                        # Resolve the value (handle {{context}} references)
                        resolved_value = self._resolve_value(value)
                        params[key] = resolved_value
            except Exception as e2:
                print(f"DEBUG: Fallback parsing also failed: {str(e2)}")
                pass
        
        return params
    
    def _parse_enhanced_action_params(self, params_str: str) -> Dict[str, Any]:
        """Parse enhanced action parameters with support for structured parameters"""
        import json
        import re

        result = {
            'path_params': {},
            'query_params': {},
            'headers': {},
            'body_params': {},
            'body': None  # Direct request body (raw JSON)
        }

        try:
            print(f"DEBUG: Parsing enhanced params_str: {repr(params_str)}")

            # Clean up the parameters string
            params_str = params_str.strip()

            # First try to resolve any {{context}} references before parsing
            def resolve_context_ref(match):
                attr_path = match.group(1)
                print(f"DEBUG: Trying to resolve context variable: {attr_path}")
                print(f"DEBUG: Current context keys: {list(self.context.keys())}")
                print(f"DEBUG: Current context values: {self.context}")
                resolved = self._get_nested_value(attr_path)
                print(f"DEBUG: Resolved {attr_path} to: {resolved}")
                # Return the raw value - JSON structure is already in place
                if isinstance(resolved, str):
                    return resolved
                else:
                    return json.dumps(resolved)

            # Replace {{...}} with resolved values
            resolved_params_str = re.sub(r'\{\{([^}]+)\}\}', resolve_context_ref, params_str)
            print(f"DEBUG: After resolving context: {repr(resolved_params_str)}")

            # Convert DSL format (unquoted keys) to valid JSON format (quoted keys)
            # Match patterns like: key: value or key: {...} and convert to "key": value or "key": {...}
            # This handles the DSL syntax: { body: {...} } -> { "body": {...} }
            # Pattern: Match unquoted keys (word characters) followed by colon, but only when:
            # - At start of string, or after opening brace ({), or after comma (,)
            # - Followed by optional whitespace then colon
            # This avoids matching colons inside string values like timestamps
            def quote_keys(match):
                prefix = match.group(1)  # The character before the key ('{', ',', or empty for start)
                key = match.group(2).strip()
                return f'{prefix}"{key}":'

            # Replace unquoted keys with quoted keys
            # Pattern: (start|{|,) followed by optional whitespace, then word characters, then colon
            resolved_params_str = re.sub(r'([\{,])\s*(\w+):', quote_keys, resolved_params_str)
            # Handle keys at the very start of the string (no prefix)
            resolved_params_str = re.sub(r'^(\w+):', r'"\1":', resolved_params_str)
            print(f"DEBUG: After quoting keys: {repr(resolved_params_str)}")

            # Try to parse as structured JSON with sections
            # Expected format: { "query_params": {...}, "headers": {...}, "body_params": {...} }
            # Or legacy format: { "param1": "value1", "param2": "value2" }

            # Wrap in braces if not already wrapped
            if not resolved_params_str.strip().startswith('{'):
                resolved_params_str = '{' + resolved_params_str + '}'

            parsed = json.loads(resolved_params_str)
            print(f"DEBUG: Parsed enhanced params: {parsed}")

            # Check if it's in new structured format
            print(f"DEBUG: Checking if structured format. Keys in parsed: {list(parsed.keys())}")
            if any(key in parsed for key in ['path_params', 'query_params', 'headers', 'body_params', 'body', 'request_body']):
                print(f"DEBUG: Using structured format")
                # New structured format
                result['path_params'] = self._resolve_param_variables(parsed.get('path_params', {}))
                result['query_params'] = self._resolve_param_variables(parsed.get('query_params', {}))
                result['headers'] = self._resolve_param_variables(parsed.get('headers', {}))
                result['body_params'] = self._resolve_param_variables(parsed.get('body_params', {}))
                # Support both 'body' and 'request_body' keys for raw JSON body
                raw_body = parsed.get('body') or parsed.get('request_body')
                print(f"DEBUG: raw_body extracted: {raw_body}")
                if raw_body is not None:
                    result['body'] = self._resolve_param_variables(raw_body) if isinstance(raw_body, dict) else raw_body
                    print(f"DEBUG: Set result['body'] to: {result['body']}")
            else:
                print(f"DEBUG: Using legacy format (all as query params)")
                # Legacy format - treat all as query params for backward compatibility
                result['query_params'] = self._resolve_param_variables(parsed)

            print(f"DEBUG: Final parsed_params result: {result}")

        except Exception as e:
            print(f"DEBUG: Enhanced parameter parsing failed: {str(e)}")
            # Fallback to legacy parsing
            legacy_params = self._parse_action_params(params_str)
            result['query_params'] = legacy_params

        return result

    def _resolve_param_variables(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively resolve variable references in parameters.
        Handles the structure: {"type": "variable", "value": "@event.field"}
        """
        if not isinstance(params, dict):
            return params

        resolved = {}
        for key, value in params.items():
            if isinstance(value, dict):
                # Check if this is a variable reference structure
                if value.get('type') == 'variable' and 'value' in value:
                    # This is a variable reference - resolve it
                    var_ref = value['value']
                    print(f"DEBUG: Resolving variable reference: {var_ref}")

                    # Handle @event.field or @context.field references
                    if var_ref.startswith('@'):
                        # Remove @ prefix and resolve from context
                        attr_path = var_ref[1:]  # Remove @

                        # Handle @event as a special case - it maps to context root
                        if attr_path.startswith('event.'):
                            attr_path = attr_path[6:]  # Remove 'event.'

                        resolved_value = self._get_nested_value(attr_path)
                        print(f"DEBUG: Resolved {var_ref} to: {resolved_value}")
                        resolved[key] = resolved_value
                    else:
                        # Direct context lookup
                        resolved_value = self._get_nested_value(var_ref)
                        print(f"DEBUG: Resolved {var_ref} to: {resolved_value}")
                        resolved[key] = resolved_value
                else:
                    # Regular nested dict - recurse
                    resolved[key] = self._resolve_param_variables(value)
            elif isinstance(value, list):
                # Recurse into lists
                resolved[key] = [
                    self._resolve_param_variables(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                # Primitive value - keep as is
                resolved[key] = value

        return resolved

    def _apply_response_mappings(self, mappings_str: str, response_data: Dict[str, Any], result: Dict[str, Any]):
        """Apply response field mappings to workflow fields"""
        try:
            # Parse mappings: "response_field" to target_field
            mappings = []
            mapping_pairs = mappings_str.split(',')
            
            for pair in mapping_pairs:
                if ' to ' in pair:
                    source, target = pair.split(' to ', 1)
                    source = source.strip().strip('"\'')
                    target = target.strip()
                    mappings.append((source, target))
            
            # Apply each mapping
            for source_field, target_field in mappings:
                # Handle nested field access (e.g., "data.document.name")
                response_value = self._get_nested_response_value(response_data, source_field)
                
                if response_value is not None:
                    
                    # Handle document field targets (@doc.field_name)
                    if target_field.startswith('@doc.') and 'documents' in self.context:
                        field_name = target_field.replace('@doc.', '')
                        
                        # Apply to all documents (similar to FOR loop logic)
                        if isinstance(self.context['documents'], list):
                            for i, doc in enumerate(self.context['documents']):
                                if isinstance(doc, dict):
                                    doc[field_name] = response_value
                                    result['assignments'][f'documents[{i}].{field_name}'] = response_value
                    else:
                        # Check if this is a temporary context variable (prefixed with $)
                        if target_field.startswith('$'):
                            # Temporary variable - add to context immediately but don't save to workflow
                            temp_var_name = target_field[1:]  # Remove $ prefix
                            self.context[temp_var_name] = response_value
                            print(f"DEBUG: Set temporary context variable {temp_var_name} = {response_value}")
                            # Also track temporary assignments for context updates
                            if 'temp_assignments' not in result:
                                result['temp_assignments'] = {}
                            result['temp_assignments'][temp_var_name] = response_value
                        else:
                            # Regular field assignment - will be saved to workflow
                            result['assignments'][target_field] = response_value
                        
        except Exception as e:
            result['errors'].append(f"Response mapping error: {str(e)}")
    
    def _get_nested_response_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """Get nested value from response data using dot notation"""
        try:
            keys = field_path.split('.')
            value = data
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
                    
            return value
        except (KeyError, TypeError):
            return None
    
    def _execute_body(self, body: str, result: Dict[str, Any]):
        """Execute the body of an if statement"""
        # Process assignments in body
        assign_pattern = r'assign\s+(.+?)\s*=\s*(.+?)(?:;|$)'
        assign_matches = re.finditer(assign_pattern, body, re.IGNORECASE)
        for match in assign_matches:
            var_name = match.group(1).strip()
            var_value = match.group(2).strip().strip('"\'')
            resolved_value = self._resolve_value(var_value)
            result['assignments'][var_name] = resolved_value
            
            # Special handling for document field assignments - DISABLED (handled by FOR loop)
            # if var_name.startswith('@doc.') and 'documents' in self.context:
            #     field_name = var_name.replace('@doc.', '')
            #     # Apply to all documents in the current context
            #     if isinstance(self.context['documents'], list):
            #         for i, doc in enumerate(self.context['documents']):
            #             if isinstance(doc, dict):
            #                 doc[field_name] = resolved_value
        
        # Process errors in body
        error_pattern = r'error\s+"([^"]+)"'
        error_matches = re.finditer(error_pattern, body, re.IGNORECASE)
        for match in error_matches:
            result['errors'].append(match.group(1))
    
    def _resolve_attributes(self, text: str) -> str:
        """Replace {{attribute}} placeholders with actual values"""
        attr_pattern = r'\{\{([^}]+)\}\}'
        
        def replace_attr(match):
            attr_path = match.group(1)
            value = self._get_nested_value(attr_path)
            return str(value) if value is not None else 'null'
        
        return re.sub(attr_pattern, replace_attr, text)
    
    def _resolve_value_in_context(self, value: str, current_item: Any = None, item_index: int = None) -> Any:
        """Resolve a value string with document context support"""
        value = value.strip()
        # print(f"DEBUG: _resolve_value_in_context called with value: {repr(value)}")
        # print(f"DEBUG: Context keys: {list(self.context.keys())}")
        # print(f"DEBUG: Context IRN: {self.context.get('irn')}")
        
        # Handle concat function
        concat_pattern = r'concat\s*\(\s*(.+?)\s*\)'
        concat_match = re.search(concat_pattern, value, re.IGNORECASE)
        if concat_match:
            args_str = concat_match.group(1)
            # Split arguments by comma, handling nested expressions
            args = self._parse_function_args(args_str)
            resolved_args = []
            
            for arg in args:
                arg = arg.strip().strip('"\'')
                # Handle document field references
                if arg.startswith('@doc.') and current_item:
                    field_name = arg.replace('@doc.', '')
                    if isinstance(current_item, dict):
                        resolved_args.append(str(current_item.get(field_name, '')))
                    else:
                        resolved_args.append('')
                else:
                    # Handle regular context attributes  
                    resolved_args.append(str(self._resolve_value(arg)))
            
            return ''.join(resolved_args)
        
        # Handle document field references
        if value.startswith('@doc.') and current_item:
            field_name = value.replace('@doc.', '')
            if isinstance(current_item, dict):
                return current_item.get(field_name, '')
            return ''
        
        # Handle regular attribute references like {{irn}}
        if value.startswith('{{') and value.endswith('}}'):
            attr_path = value[2:-2]
            resolved = self._get_nested_value(attr_path)
            return resolved
        
        # Fall back to regular resolution
        return self._resolve_value(value)
    
    def _parse_function_args(self, args_str: str) -> List[str]:
        """Parse function arguments, handling nested expressions"""
        args = []
        current_arg = ''
        paren_depth = 0
        in_quotes = False
        quote_char = None
        
        for char in args_str:
            if char in ['"', "'"] and not in_quotes:
                in_quotes = True
                quote_char = char
                current_arg += char
            elif char == quote_char and in_quotes:
                in_quotes = False
                quote_char = None
                current_arg += char
            elif char == '(' and not in_quotes:
                paren_depth += 1
                current_arg += char
            elif char == ')' and not in_quotes:
                paren_depth -= 1
                current_arg += char
            elif char == ',' and not in_quotes and paren_depth == 0:
                args.append(current_arg.strip())
                current_arg = ''
            else:
                current_arg += char
        
        if current_arg.strip():
            args.append(current_arg.strip())
            
        return args
    
    def _resolve_value(self, value: str) -> Any:
        """Resolve a value string to actual value"""
        value = value.strip()
        
        # Handle string literals
        if value.startswith('"') and value.endswith('"'):
            return value[1:-1]
        if value.startswith("'") and value.endswith("'"):
            return value[1:-1]
        
        # Handle attributes
        if value.startswith('{{') and value.endswith('}}'):
            attr_path = value[2:-2]
            return self._get_nested_value(attr_path)
        
        # Handle numbers
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except ValueError:
            pass
        
        # Handle booleans
        if value.lower() == 'true':
            return True
        if value.lower() == 'false':
            return False
        if value.lower() == 'null':
            return None
        
        # Return as string
        return value
    
    def _get_nested_value(self, attr_path: str) -> Any:
        """Get nested value from context using dot notation"""
        try:
            keys = attr_path.split('.')
            value = self.context
            
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                elif isinstance(value, list) and key.isdigit():
                    index = int(key)
                    value = value[index] if 0 <= index < len(value) else None
                else:
                    return None
                    
                if value is None:
                    return None
            
            return value
        except (KeyError, IndexError, TypeError):
            return None
    
    def _is_inside_if_block(self, position: int, text: str) -> bool:
        """Check if position is inside an if block"""
        before = text[:position]
        if_count = len(re.findall(r'if\s*\(', before, re.IGNORECASE))
        close_count = len(re.findall(r'\}', before))
        return if_count > close_count


class WorkflowRuleService:
    """Service for executing workflow rules"""
    
    def __init__(self):
        self.rule_engine = SimpleRuleEngine()
    
    def execute_workflow_rules(self, workflow_execution, trigger_step: int) -> List[Dict[str, Any]]:
        """Execute all active rules for a workflow at the specified trigger step"""
        from .models import WorkflowRule, RuleExecution
        
        rules = WorkflowRule.objects.filter(
            workflow=workflow_execution.workflow,
            trigger_step=trigger_step,
            is_active=True
        ).order_by('execution_order')
        
        results = []
        
        # Prepare context data
        context_data = self._prepare_context_data(workflow_execution)
        
        for rule in rules:
            try:
                # Create rule execution record first to get the ID for logging
                rule_execution = RuleExecution.objects.create(
                    workflow_execution=workflow_execution,
                    workflow_rule=rule,
                    status='pending',  # Will be updated after execution
                    context_data=context_data
                )
                
                # Execute the rule with logging context
                execution_result = self.rule_engine.execute_rule(
                    rule.rule_definition, 
                    context_data,
                    workflow_execution=workflow_execution,
                    workflow_rule=rule,
                    rule_execution=rule_execution
                )
                
                # Determine status
                if execution_result['success']:
                    if execution_result['result'].get('errors'):
                        status = 'error'
                        error_message = '; '.join(execution_result['result']['errors'])
                    elif execution_result['result'].get('warnings'):
                        status = 'warning' 
                        error_message = '; '.join(execution_result['result']['warnings'])
                    else:
                        status = 'success'
                        error_message = ''
                else:
                    status = 'error'
                    error_message = execution_result.get('error', 'Unknown error')
                
                # Update the existing rule execution record with results
                rule_execution.status = status
                rule_execution.execution_result = execution_result
                rule_execution.error_message = error_message
                rule_execution.execution_time_ms = execution_result.get('execution_time_ms')
                rule_execution.save()
                
                # Apply rule assignments back to workflow execution
                if execution_result.get('success') and execution_result.get('result', {}).get('assignments'):
                    self._apply_assignments_to_workflow(workflow_execution, execution_result['result']['assignments'])
                
                results.append({
                    'rule_execution': rule_execution,
                    'result': execution_result
                })
                
            except Exception as e:
                # Create error record
                rule_execution = RuleExecution.objects.create(
                    workflow_execution=workflow_execution,
                    workflow_rule=rule,
                    status='error',
                    error_message=str(e),
                    context_data=context_data
                )
                
                results.append({
                    'rule_execution': rule_execution,
                    'result': {'success': False, 'error': str(e)}
                })
        
        return results
    
    def _apply_assignments_to_workflow(self, workflow_execution, assignments: Dict[str, Any]):
        """Apply rule assignments back to workflow execution context"""
        try:
            print(f"DEBUG: Applying assignments to workflow: {assignments}")
            
            # Initialize step2_data if it doesn't exist
            if not workflow_execution.step2_data:
                workflow_execution.step2_data = [{}]
            
            # Ensure step2_data is a list with at least one document
            if not isinstance(workflow_execution.step2_data, list):
                workflow_execution.step2_data = [{}]
            
            if len(workflow_execution.step2_data) == 0:
                workflow_execution.step2_data = [{}]
            
            # Apply assignments to the first document (or workflow context)
            document = workflow_execution.step2_data[0]
            
            for field_name, field_value in assignments.items():
                # Handle document-specific assignments (documents[0].field_name)
                if field_name.startswith('documents[') and '].' in field_name:
                    # Extract index and field name from "documents[0].field_name"
                    import re
                    match = re.match(r'documents\[(\d+)\]\.(.+)', field_name)
                    if match:
                        doc_index = int(match.group(1))
                        doc_field = match.group(2)
                        
                        # Ensure we have enough documents
                        while len(workflow_execution.step2_data) <= doc_index:
                            workflow_execution.step2_data.append({})
                        
                        workflow_execution.step2_data[doc_index][doc_field] = field_value
                        print(f"DEBUG: Applied {doc_field} = {field_value} to document {doc_index}")
                else:
                    # Apply to first document for simple field names
                    document[field_name] = field_value
                    print(f"DEBUG: Applied {field_name} = {field_value} to document")
            
            # Save the updated workflow execution
            workflow_execution.save()
            print(f"DEBUG: Workflow execution updated with assignments")
            
        except Exception as e:
            print(f"ERROR: Failed to apply assignments to workflow: {str(e)}")
    
    def _prepare_context_data(self, workflow_execution) -> Dict[str, Any]:
        """Prepare context data for rule execution"""
        # Initialize default documents if step2_data is empty
        if not workflow_execution.step2_data:
            workflow_execution.step2_data = [
                {
                    'document_status': '',
                    'document_name': '',
                    'document_id': '',
                    'invitee_name': '',
                    'invitee_email': '',
                }
            ]
            workflow_execution.save()
        
        documents = workflow_execution.step2_data
        
        return {
            'workflow_id': workflow_execution.workflow.id,
            'workflow_name': workflow_execution.workflow.name,
            'execution_id': workflow_execution.id,
            'current_step': workflow_execution.current_step,
            'irn': workflow_execution.irn,
            'customer_id': workflow_execution.customer_id,
            'stamp_group': workflow_execution.stamp_group,
            'stamp_amount': float(workflow_execution.stamp_amount) if workflow_execution.stamp_amount else None,
            'step2_data': documents,
            'documents': documents,  # Alias for easier access
            'started_at': workflow_execution.started_at.isoformat(),
        }


class RuleEngineService:
    """Service for handling rule engine integration and async completions"""
    
    def __init__(self):
        self.workflow_rule_service = WorkflowRuleService()
    
    def handle_async_completion(self, execution_id):
        """Handle completion of async action and update workflow data based on final response"""
        try:
            from connectors.models import AsyncActionExecution
            from .models import WorkflowExecution
            
            # Get the async execution
            async_execution = AsyncActionExecution.objects.get(execution_id=execution_id)
            
            # Get the associated workflow execution
            if not async_execution.workflow_execution_id:
                print(f"DEBUG: No workflow execution ID for async execution {execution_id}")
                return
                
            workflow_execution = WorkflowExecution.objects.get(id=async_execution.workflow_execution_id)
            
            # Check if async execution completed successfully
            if async_execution.status == 'completed' and async_execution.final_response:
                print(f"DEBUG: Processing async completion for execution {execution_id}")
                print(f"DEBUG: Final response: {async_execution.final_response}")
                
                # Extract the status from the final polling response
                # Based on the Automated Sign action, we want data.document.status
                final_response = async_execution.final_response
                document_status = None
                
                if isinstance(final_response, dict):
                    # Try to extract data.document.status
                    if 'data' in final_response and isinstance(final_response['data'], dict):
                        if 'document' in final_response['data'] and isinstance(final_response['data']['document'], dict):
                            document_status = final_response['data']['document'].get('status')
                
                print(f"DEBUG: Extracted document status: {document_status}")
                
                # Apply response mappings from the original rule
                self._apply_async_response_mappings(async_execution, workflow_execution, final_response)
            else:
                print(f"DEBUG: Async execution {execution_id} not completed successfully. Status: {async_execution.status}")
                
        except Exception as e:
            print(f"ERROR: Failed to handle async completion for {execution_id}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _apply_async_response_mappings(self, async_execution, workflow_execution, final_response):
        """Apply response mappings from the rule definition to workflow fields"""
        try:
            # Get the original rule definition that triggered this async action
            if not async_execution.workflow_rule_id:
                print("DEBUG: No workflow rule ID for async execution")
                return
            
            from .models import WorkflowRule
            workflow_rule = WorkflowRule.objects.get(id=async_execution.workflow_rule_id)
            rule_definition = workflow_rule.rule_definition
            
            print(f"DEBUG: Applying async response mappings from rule: {workflow_rule.name}")
            print(f"DEBUG: Rule definition: {rule_definition}")
            
            # Parse the response mappings from the rule definition
            import re
            # Pattern to match: map response { "source" to target, "source2" to target2 }
            map_pattern = r'map\s+response\s*\{([^}]+)\}'
            map_match = re.search(map_pattern, rule_definition, re.IGNORECASE | re.DOTALL)
            
            if not map_match:
                print("DEBUG: No response mappings found in rule definition")
                return
            
            mappings_str = map_match.group(1).strip()
            print(f"DEBUG: Found mappings string: {mappings_str}")
            
            # Parse individual mappings: "source" to target
            mappings = []
            mapping_pairs = mappings_str.split(',')
            
            for pair in mapping_pairs:
                pair = pair.strip()
                if ' to ' in pair:
                    source, target = pair.split(' to ', 1)
                    source = source.strip().strip('"\'')
                    target = target.strip()
                    mappings.append((source, target))
            
            print(f"DEBUG: Parsed mappings: {mappings}")
            
            # Apply each mapping
            for source_field, target_field in mappings:
                # Extract value from final response
                response_value = self._get_nested_response_value(final_response, source_field)
                print(f"DEBUG: Mapping {source_field} -> {target_field}: {response_value}")
                
                if response_value is not None:
                    # Initialize step2_data if needed
                    if not workflow_execution.step2_data:
                        workflow_execution.step2_data = [{}]
                    elif not isinstance(workflow_execution.step2_data, list):
                        workflow_execution.step2_data = [{}]
                    elif len(workflow_execution.step2_data) == 0:
                        workflow_execution.step2_data = [{}]
                    
                    # Apply the mapping to the first document
                    workflow_execution.step2_data[0][target_field] = response_value
                    print(f"DEBUG: Applied mapping {source_field} -> {target_field} = {response_value}")
            
            # Save the updated workflow execution
            workflow_execution.save()
            print(f"DEBUG: Saved workflow execution with updated mappings")
            
        except Exception as e:
            print(f"ERROR: Failed to apply async response mappings: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _get_nested_response_value(self, data, field_path):
        """Get nested value from response data using dot notation"""
        try:
            keys = field_path.split('.')
            value = data
            
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
                    
            return value
        except (KeyError, TypeError):
            return None