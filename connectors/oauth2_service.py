"""
OAuth2 Authorization Code Flow Service

This module handles the OAuth2 authorization code flow for credential sets:
1. Initiate - Generate authorization URL with state parameter
2. Callback - Exchange authorization code for tokens and create credential set
3. Token Refresh - Refresh expired access tokens
"""

import secrets
import requests
import logging
from datetime import timedelta
from urllib.parse import urlencode, urlparse, parse_qs

from django.utils import timezone
from django.conf import settings

from .models import Credential, CredentialSet, OAuth2State

logger = logging.getLogger(__name__)

# State expiration time (10 minutes)
STATE_EXPIRATION_MINUTES = 10


class OAuth2Error(Exception):
    """Custom exception for OAuth2 errors"""
    pass


class OAuth2Service:
    """Service for handling OAuth2 Authorization Code flow"""

    @staticmethod
    def generate_state():
        """Generate a cryptographically secure random state string"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def get_redirect_uri(request):
        """
        Generate the OAuth2 callback redirect URI.
        This is where the third-party will redirect after authorization.
        """
        # Build the callback URL based on the request
        scheme = 'https' if request.is_secure() else 'http'
        host = request.get_host()
        return f"{scheme}://{host}/api/oauth2/callback/"

    @classmethod
    def initiate_authorization(cls, credential_id, set_name, is_default, redirect_url, request):
        """
        Initiate the OAuth2 authorization flow.

        Args:
            credential_id: ID of the credential profile
            set_name: Name for the credential set to be created
            is_default: Whether to set as default credential set
            redirect_url: URL to redirect user after completion
            request: The HTTP request object

        Returns:
            dict with 'authorization_url' to redirect the user to
        """
        try:
            credential = Credential.objects.get(id=credential_id)
        except Credential.DoesNotExist:
            raise OAuth2Error("Credential profile not found")

        if credential.auth_type != 'oauth2':
            raise OAuth2Error("Credential profile is not configured for OAuth2")

        # Validate OAuth2 configuration
        if not credential.oauth2_auth_url:
            raise OAuth2Error("OAuth2 authorization URL not configured in credential profile")
        if not credential.oauth2_token_url:
            raise OAuth2Error("OAuth2 token URL not configured in credential profile")
        if not credential.oauth2_client_id:
            raise OAuth2Error("OAuth2 client ID not configured in credential profile")

        # Check if a credential set with this name already exists
        if CredentialSet.objects.filter(credential=credential, name=set_name).exists():
            raise OAuth2Error(f"A credential set with name '{set_name}' already exists")

        # Generate state and save it
        state = cls.generate_state()
        expires_at = timezone.now() + timedelta(minutes=STATE_EXPIRATION_MINUTES)

        OAuth2State.objects.create(
            state=state,
            credential=credential,
            set_name=set_name,
            is_default=is_default,
            redirect_url=redirect_url,
            expires_at=expires_at
        )

        # Build authorization URL
        redirect_uri = cls.get_redirect_uri(request)

        params = {
            'client_id': credential.oauth2_client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'state': state,
            # Request offline access to get refresh token (required by many providers like Zoho, Google)
            'access_type': 'offline',
            # Force consent prompt to ensure we get refresh token (some providers need this)
            'prompt': 'consent',
        }

        # Add scope if configured
        if credential.oauth2_scope:
            params['scope'] = credential.oauth2_scope

        authorization_url = f"{credential.oauth2_auth_url}?{urlencode(params)}"

        logger.info(f"Initiating OAuth2 flow for credential {credential.name}, state={state[:8]}...")

        return {
            'authorization_url': authorization_url,
            'state': state,
            'expires_in_seconds': STATE_EXPIRATION_MINUTES * 60
        }

    @classmethod
    def handle_callback(cls, code, state, request):
        """
        Handle the OAuth2 callback after user authorization.

        Args:
            code: Authorization code from the third-party
            state: State parameter to validate the request
            request: The HTTP request object

        Returns:
            dict with created credential set info and redirect URL
        """
        # Look up the state
        try:
            oauth_state = OAuth2State.objects.get(state=state)
        except OAuth2State.DoesNotExist:
            raise OAuth2Error("Invalid or expired state parameter. Please try again.")

        # Check expiration
        if oauth_state.is_expired():
            oauth_state.delete()
            raise OAuth2Error("Authorization session expired. Please try again.")

        credential = oauth_state.credential

        # Exchange code for tokens
        redirect_uri = cls.get_redirect_uri(request)

        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': credential.oauth2_client_id,
            'client_secret': credential.oauth2_client_secret,
        }

        try:
            response = requests.post(
                credential.oauth2_token_url,
                data=token_data,
                headers={'Accept': 'application/json'},
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
                raise OAuth2Error(f"Failed to exchange authorization code: {response.text}")

            token_response = response.json()

        except requests.RequestException as e:
            logger.error(f"Token exchange request failed: {str(e)}")
            raise OAuth2Error(f"Failed to connect to token endpoint: {str(e)}")

        # Extract tokens
        access_token = token_response.get('access_token')
        refresh_token = token_response.get('refresh_token', '')
        expires_in = token_response.get('expires_in')  # Usually in seconds
        token_type = token_response.get('token_type', 'Bearer')

        if not access_token:
            raise OAuth2Error("No access token received from provider")

        # Calculate expiration time
        token_expires_at = None
        if expires_in:
            token_expires_at = (timezone.now() + timedelta(seconds=int(expires_in))).isoformat()

        # Create credential set with tokens
        credential_values = {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': token_type,
            'token_expires_at': token_expires_at,
        }

        credential_set = CredentialSet.objects.create(
            credential=credential,
            name=oauth_state.set_name,
            credential_values=credential_values,
            is_default=oauth_state.is_default
        )

        logger.info(f"Successfully created OAuth2 credential set '{oauth_state.set_name}' for {credential.name}")

        # Get redirect URL and clean up state
        redirect_url = oauth_state.redirect_url
        oauth_state.delete()

        # Clean up any other expired states
        OAuth2State.objects.filter(expires_at__lt=timezone.now()).delete()

        return {
            'success': True,
            'credential_set_id': credential_set.id,
            'credential_set_name': credential_set.name,
            'credential_name': credential.name,
            'redirect_url': redirect_url
        }

    @classmethod
    def fetch_client_credentials_token(cls, credential, credential_set):
        """
        Fetch OAuth2 token using Client Credentials grant type.

        Args:
            credential: Credential profile with OAuth2 config
            credential_set: CredentialSet with client_id and client_secret

        Returns:
            Updated credential_values dict with access token
        """
        if credential.auth_type != 'oauth2_client_credentials':
            raise OAuth2Error("Credential is not OAuth2 Client Credentials type")

        if not credential.oauth2_token_url:
            raise OAuth2Error("Token URL not configured in credential profile")

        credential_values = credential_set.credential_values or {}
        client_id = credential_values.get('client_id')
        client_secret = credential_values.get('client_secret')

        if not client_id or not client_secret:
            raise OAuth2Error("Client ID and Client Secret are required in credential set")

        token_data = {
            'grant_type': 'client_credentials',
            'client_id': client_id,
            'client_secret': client_secret,
        }

        if credential.oauth2_scope:
            token_data['scope'] = credential.oauth2_scope

        try:
            response = requests.post(
                credential.oauth2_token_url,
                data=token_data,
                headers={'Accept': 'application/json'},
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"Client credentials token fetch failed: {response.status_code} - {response.text}")
                raise OAuth2Error(f"Failed to fetch token: {response.text}")

            token_response = response.json()

        except requests.RequestException as e:
            logger.error(f"Client credentials token request failed: {str(e)}")
            raise OAuth2Error(f"Failed to connect to token endpoint: {str(e)}")

        access_token = token_response.get('access_token')
        if not access_token:
            raise OAuth2Error("No access token received from provider")

        expires_in = token_response.get('expires_in')
        token_expires_at = None
        if expires_in:
            token_expires_at = (timezone.now() + timedelta(seconds=int(expires_in))).isoformat()

        # Update credential_values with token while preserving client_id/secret
        credential_set.credential_values = {
            'client_id': client_id,
            'client_secret': client_secret,
            'access_token': access_token,
            'token_type': token_response.get('token_type', 'Bearer'),
            'token_expires_at': token_expires_at,
        }
        credential_set.save()

        logger.info(f"Successfully fetched client credentials token for '{credential_set.name}'")

        return credential_set.credential_values

    @classmethod
    def get_token_status(cls, credential_set):
        """
        Get the token status for a credential set.

        Returns:
            dict with status, expires_at, and message
        """
        credential = credential_set.credential
        if credential.auth_type not in ('oauth2', 'oauth2_client_credentials'):
            return {'status': 'not_applicable', 'expires_at': None, 'message': 'Not an OAuth2 credential'}

        credential_values = credential_set.credential_values or {}
        access_token = credential_values.get('access_token')
        token_expires_at = credential_values.get('token_expires_at')

        # Check if token has never been fetched
        if not access_token:
            return {
                'status': 'not_fetched',
                'expires_at': None,
                'message': 'Token not yet fetched'
            }

        if not token_expires_at:
            return {
                'status': 'no_expiry',
                'expires_at': None,
                'message': 'No expiration information'
            }

        try:
            from datetime import datetime
            if isinstance(token_expires_at, str):
                expires_at = datetime.fromisoformat(token_expires_at.replace('Z', '+00:00'))
                if timezone.is_naive(expires_at):
                    expires_at = timezone.make_aware(expires_at)
            else:
                expires_at = token_expires_at

            now = timezone.now()
            buffer_5min = timedelta(minutes=5)

            if now >= expires_at:
                return {
                    'status': 'expired',
                    'expires_at': expires_at.isoformat(),
                    'message': 'Token has expired'
                }
            elif now >= (expires_at - buffer_5min):
                return {
                    'status': 'expiring_soon',
                    'expires_at': expires_at.isoformat(),
                    'message': 'Token expires within 5 minutes'
                }
            else:
                return {
                    'status': 'valid',
                    'expires_at': expires_at.isoformat(),
                    'message': 'Token is valid'
                }
        except Exception as e:
            logger.warning(f"Error checking token status: {e}")
            return {
                'status': 'unknown',
                'expires_at': None,
                'message': f'Error checking status: {str(e)}'
            }

    @classmethod
    def refresh_token(cls, credential_set):
        """
        Refresh an expired access token using the refresh token.
        For client credentials, re-fetches using client_id/secret.

        Args:
            credential_set: The CredentialSet instance to refresh

        Returns:
            Updated credential_values dict with new tokens
        """
        credential = credential_set.credential

        if credential.auth_type not in ('oauth2', 'oauth2_client_credentials'):
            raise OAuth2Error("Credential is not an OAuth2 type")

        # For client credentials, use the fetch method instead
        if credential.auth_type == 'oauth2_client_credentials':
            return cls.fetch_client_credentials_token(credential, credential_set)

        credential_values = credential_set.credential_values
        refresh_token = credential_values.get('refresh_token')

        if not refresh_token:
            raise OAuth2Error("No refresh token available. User must re-authorize.")

        token_data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': credential.oauth2_client_id,
            'client_secret': credential.oauth2_client_secret,
        }

        try:
            response = requests.post(
                credential.oauth2_token_url,
                data=token_data,
                headers={'Accept': 'application/json'},
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
                raise OAuth2Error(f"Failed to refresh token: {response.text}")

            token_response = response.json()

        except requests.RequestException as e:
            logger.error(f"Token refresh request failed: {str(e)}")
            raise OAuth2Error(f"Failed to connect to token endpoint: {str(e)}")

        # Update tokens
        new_access_token = token_response.get('access_token')
        new_refresh_token = token_response.get('refresh_token', refresh_token)  # Some providers return new refresh token
        expires_in = token_response.get('expires_in')
        token_type = token_response.get('token_type', 'Bearer')

        if not new_access_token:
            raise OAuth2Error("No access token received during refresh")

        # Calculate new expiration time
        token_expires_at = None
        if expires_in:
            token_expires_at = (timezone.now() + timedelta(seconds=int(expires_in))).isoformat()

        # Update credential set
        credential_set.credential_values = {
            'access_token': new_access_token,
            'refresh_token': new_refresh_token,
            'token_type': token_type,
            'token_expires_at': token_expires_at,
        }
        credential_set.save()

        logger.info(f"Successfully refreshed OAuth2 token for '{credential_set.name}'")

        return credential_set.credential_values

    @classmethod
    def is_token_expired(cls, credential_set):
        """
        Check if the access token is expired or about to expire.

        Args:
            credential_set: The CredentialSet instance to check

        Returns:
            True if token is expired or expires within 5 minutes
        """
        credential_values = credential_set.credential_values
        token_expires_at = credential_values.get('token_expires_at')

        if not token_expires_at:
            return False  # No expiration info, assume valid

        try:
            from datetime import datetime
            if isinstance(token_expires_at, str):
                expires_at = datetime.fromisoformat(token_expires_at.replace('Z', '+00:00'))
                if timezone.is_naive(expires_at):
                    expires_at = timezone.make_aware(expires_at)
            else:
                expires_at = token_expires_at

            # Consider expired if within 5 minutes of expiration
            buffer = timedelta(minutes=5)
            return timezone.now() >= (expires_at - buffer)
        except Exception as e:
            logger.warning(f"Error checking token expiration: {e}")
            return False

    @classmethod
    def get_valid_access_token(cls, credential_set):
        """
        Get a valid access token, refreshing if necessary.

        Args:
            credential_set: The CredentialSet instance

        Returns:
            Valid access token string
        """
        if cls.is_token_expired(credential_set):
            logger.info(f"Token expired for '{credential_set.name}', refreshing...")
            cls.refresh_token(credential_set)

        return credential_set.credential_values.get('access_token')
