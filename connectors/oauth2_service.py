import requests
import time
from datetime import datetime, timedelta
from django.utils import timezone


class OAuth2Service:
    def __init__(self):
        self.timeout = 30

    def fetch_tokens(self, client_id, client_secret, token_url, scope=None):
        """
        Fetch OAuth2 tokens using Client Credentials Grant flow
        Returns dict with success status, tokens, or error details
        """
        start_time = time.time()
        
        try:
            # Prepare request data for client credentials grant
            data = {
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret,
            }
            
            if scope:
                data['scope'] = scope
            
            # Prepare headers
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            }
            
            # Make token request
            response = requests.post(
                url=token_url,
                data=data,
                headers=headers,
                timeout=self.timeout
            )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Check if request was successful
            if response.status_code == 200:
                try:
                    token_data = response.json()
                    
                    # Validate required fields
                    if 'access_token' not in token_data:
                        return {
                            'success': False,
                            'error': 'Missing access_token in response',
                            'response_time_ms': response_time_ms,
                            'status_code': response.status_code,
                            'response_body': token_data,
                        }
                    
                    # Calculate token expiration
                    expires_in = token_data.get('expires_in', 3600)  # Default to 1 hour
                    expires_at = timezone.now() + timedelta(seconds=expires_in)
                    
                    return {
                        'success': True,
                        'access_token': token_data['access_token'],
                        'refresh_token': token_data.get('refresh_token'),  # May not be present in client credentials
                        'expires_at': expires_at,
                        'expires_in': expires_in,
                        'token_type': token_data.get('token_type', 'Bearer'),
                        'scope': token_data.get('scope', scope),
                        'response_time_ms': response_time_ms,
                        'status_code': response.status_code,
                        'full_response': token_data,
                    }
                    
                except ValueError as e:
                    return {
                        'success': False,
                        'error': f'Invalid JSON response: {str(e)}',
                        'response_time_ms': response_time_ms,
                        'status_code': response.status_code,
                        'response_body': response.text,
                    }
            
            else:
                # Handle error responses
                try:
                    error_data = response.json()
                    error_message = error_data.get('error_description') or error_data.get('error') or f'HTTP {response.status_code}'
                except:
                    error_message = f'HTTP {response.status_code}: {response.text}'
                
                return {
                    'success': False,
                    'error': error_message,
                    'response_time_ms': response_time_ms,
                    'status_code': response.status_code,
                    'response_body': response.text,
                    'error_details': {
                        'grant_type': 'client_credentials',
                        'client_id': client_id,
                        'token_url': token_url,
                        'scope': scope,
                    }
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': f'Request timeout after {self.timeout} seconds',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'timeout',
                'token_url': token_url,
            }
            
        except requests.exceptions.ConnectionError as e:
            return {
                'success': False,
                'error': 'Connection error - unable to reach the token endpoint',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'connection_error',
                'error_details': str(e),
                'token_url': token_url,
                'possible_causes': [
                    'Token URL is incorrect or unreachable',
                    'Network connectivity issues',
                    'SSL/TLS certificate problems',
                    'Firewall blocking the request'
                ]
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Request failed: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'request_exception',
                'error_details': str(e),
                'token_url': token_url,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
                'error_type': 'unexpected_error',
                'error_details': str(e),
                'token_url': token_url,
            }

    def refresh_access_token(self, client_id, client_secret, token_url, refresh_token):
        """
        Refresh OAuth2 access token using refresh token
        """
        start_time = time.time()
        
        try:
            data = {
                'grant_type': 'refresh_token',
                'client_id': client_id,
                'client_secret': client_secret,
                'refresh_token': refresh_token,
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            }
            
            response = requests.post(
                url=token_url,
                data=data,
                headers=headers,
                timeout=self.timeout
            )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                token_data = response.json()
                expires_in = token_data.get('expires_in', 3600)
                expires_at = timezone.now() + timedelta(seconds=expires_in)
                
                return {
                    'success': True,
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', refresh_token),  # Some providers don't return new refresh token
                    'expires_at': expires_at,
                    'expires_in': expires_in,
                    'response_time_ms': response_time_ms,
                }
            else:
                return {
                    'success': False,
                    'error': f'Token refresh failed: HTTP {response.status_code}',
                    'response_time_ms': response_time_ms,
                    'status_code': response.status_code,
                    'response_body': response.text,
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Token refresh error: {str(e)}',
                'response_time_ms': int((time.time() - start_time) * 1000),
            }