import requests
import time
import json
from datetime import datetime, timedelta
from django.utils import timezone
from .models import CustomAuthConfig


class CustomAuthService:
    """Service for handling custom authentication with dynamic token fetching"""
    
    def __init__(self):
        self.timeout = 30
    
    def get_auth_values(self, credential):
        """
        Get all authentication values for a credential with custom auth type.
        Returns a dictionary of key-value pairs for authentication.
        """
        if credential.auth_type != 'custom':
            return {}
        
        auth_values = {}
        
        for config in credential.custom_auth_configs.all():
            if config.value_type == 'static':
                auth_values[config.key_name] = config.static_value
            elif config.value_type == 'dynamic':
                token = self.get_dynamic_token(config)
                if token:
                    auth_values[config.key_name] = token
        
        return auth_values
    
    def get_dynamic_token(self, config):
        """
        Get token from dynamic API configuration.
        Uses caching to avoid unnecessary API calls.
        """
        # Check if cached token is still valid
        if self.is_token_cached_and_valid(config):
            return config.cached_token
        
        # Fetch new token from API
        token = self.fetch_token_from_api(config)
        if token:
            # Update cache
            config.cached_token = token
            config.cached_at = timezone.now()
            config.save(update_fields=['cached_token', 'cached_at'])
        
        return token
    
    def is_token_cached_and_valid(self, config):
        """Check if the cached token is still valid based on cache duration"""
        if not config.cached_token or not config.cached_at:
            return False
        
        cache_expiry = config.cached_at + timedelta(minutes=config.cache_duration_minutes)
        return timezone.now() < cache_expiry
    
    def fetch_token_from_api(self, config):
        """
        Fetch token from the configured API endpoint.
        Returns the token value or None if failed.
        """
        try:
            # Prepare request
            headers = config.api_headers or {}
            headers.setdefault('Content-Type', 'application/json')
            
            # Make API request
            if config.api_method.upper() in ['GET', 'DELETE']:
                response = requests.request(
                    method=config.api_method.upper(),
                    url=config.api_url,
                    headers=headers,
                    params=config.api_query_params or {},
                    timeout=self.timeout
                )
            else:
                response = requests.request(
                    method=config.api_method.upper(),
                    url=config.api_url,
                    headers=headers,
                    params=config.api_query_params or {},
                    json=config.api_body or {},
                    timeout=self.timeout
                )
            
            if response.status_code == 200:
                response_data = response.json()
                token = self.extract_token_from_response(response_data, config.response_path)
                return token
            
        except Exception as e:
            # Log error but don't raise - we'll return None
            print(f"Error fetching token for {config.key_name}: {str(e)}")
        
        return None
    
    def extract_token_from_response(self, response_data, response_path):
        """
        Extract token from API response using the configured response path.
        Supports nested JSON paths like 'data.token' or 'result.auth_key'.
        """
        if not response_path:
            # If no path specified, assume the entire response is the token
            return response_data
        
        try:
            # Split path by dots to handle nested objects
            path_parts = response_path.split('.')
            current_data = response_data
            
            for part in path_parts:
                if isinstance(current_data, dict):
                    current_data = current_data.get(part)
                else:
                    return None
                
                if current_data is None:
                    return None
            
            return str(current_data) if current_data is not None else None
            
        except Exception as e:
            print(f"Error extracting token from response path '{response_path}': {str(e)}")
            return None
    
    def test_dynamic_api(self, api_config):
        """
        Test a dynamic API configuration and return detailed results.
        Used for validation before saving the configuration.
        """
        start_time = time.time()
        
        try:
            # Prepare test request
            headers = api_config.get('api_headers', {})
            headers.setdefault('Content-Type', 'application/json')
            
            # Make test API request
            if api_config['api_method'].upper() in ['GET', 'DELETE']:
                response = requests.request(
                    method=api_config['api_method'].upper(),
                    url=api_config['api_url'],
                    headers=headers,
                    params=api_config.get('api_query_params', {}),
                    timeout=self.timeout
                )
            else:
                response = requests.request(
                    method=api_config['api_method'].upper(),
                    url=api_config['api_url'],
                    headers=headers,
                    params=api_config.get('api_query_params', {}),
                    json=api_config.get('api_body', {}),
                    timeout=self.timeout
                )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    
                    # Try to extract token using response path
                    token = None
                    if api_config.get('response_path'):
                        token = self.extract_token_from_response(response_data, api_config['response_path'])
                    
                    return {
                        'success': True,
                        'status_code': response.status_code,
                        'response_time_ms': response_time_ms,
                        'response_data': response_data,
                        'extracted_token': token,
                        'token_extracted': token is not None,
                        'message': 'API test successful'
                    }
                    
                except ValueError as e:
                    return {
                        'success': False,
                        'status_code': response.status_code,
                        'response_time_ms': response_time_ms,
                        'error': f'Invalid JSON response: {str(e)}',
                        'response_body': response.text
                    }
            else:
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'response_time_ms': response_time_ms,
                    'error': f'API returned HTTP {response.status_code}',
                    'response_body': response.text
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': f'Request timeout after {self.timeout} seconds',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'timeout'
            }
            
        except requests.exceptions.ConnectionError as e:
            return {
                'success': False,
                'error': 'Connection error - unable to reach the API endpoint',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'connection_error',
                'error_details': str(e),
                'possible_causes': [
                    'API URL is incorrect or unreachable',
                    'Network connectivity issues',
                    'SSL/TLS certificate problems',
                    'Firewall blocking the request'
                ]
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'unexpected_error',
                'error_details': str(e)
            }
    
    def clear_cached_token(self, config):
        """Clear the cached token for a configuration"""
        config.cached_token = ''
        config.cached_at = None
        config.save(update_fields=['cached_token', 'cached_at'])
    
    def refresh_all_tokens(self, credential):
        """Refresh all dynamic tokens for a credential by clearing cache"""
        for config in credential.custom_auth_configs.filter(value_type='dynamic'):
            self.clear_cached_token(config)