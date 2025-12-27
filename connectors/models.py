from django.db import models
from django.contrib.auth.models import User
import json


class Credential(models.Model):
    AUTH_TYPES = [
        ('none', 'No Authentication'),
        ('basic', 'Basic Authentication'),
        ('api_key', 'API Key'),
        ('bearer', 'Bearer Token'),
        ('oauth2', 'OAuth 2.0 (Authorization Code)'),
        ('oauth2_client_credentials', 'OAuth 2.0 (Client Credentials)'),
        ('custom', 'Custom Authentication'),
    ]

    CREDENTIAL_TYPES = [
        ('system', 'System Credential Profile'),
        ('custom', 'Custom Credential Profile'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    auth_type = models.CharField(max_length=30, choices=AUTH_TYPES, default='none')
    credential_type = models.CharField(max_length=10, choices=CREDENTIAL_TYPES, default='custom', help_text="System or custom credential profile")

    # Configuration fields (non-secret) - these define the structure
    # API Key configuration
    api_key_header = models.CharField(max_length=50, default='X-API-Key', blank=True, help_text="Header name for API key (e.g., 'X-API-Key', 'Authorization')")

    # OAuth2 configuration (URLs and scope, not secrets)
    oauth2_auth_url = models.URLField(blank=True, help_text="OAuth2 authorization URL")
    oauth2_token_url = models.URLField(blank=True, help_text="OAuth2 token URL")
    oauth2_scope = models.CharField(max_length=255, blank=True, help_text="OAuth2 scope")

    # OAuth2 token header configuration
    oauth2_token_header = models.CharField(max_length=50, default='Authorization', blank=True,
                                           help_text="Header name for passing OAuth2 token (e.g., 'Authorization')")
    oauth2_token_prefix = models.CharField(max_length=50, default='Bearer', blank=True,
                                           help_text="Prefix before token value (e.g., 'Bearer', 'Zoho-oauthtoken')")

    # Custom Auth configuration - defines structure, not values
    custom_auth_config = models.JSONField(default=dict, blank=True, help_text="Custom authentication structure configuration (field names, types, descriptions)")

    # Legacy fields - kept for backward compatibility, will be migrated to CredentialSet
    # These should be considered deprecated
    username = models.CharField(max_length=100, blank=True)
    password = models.CharField(max_length=255, blank=True)
    api_key = models.CharField(max_length=255, blank=True)
    bearer_token = models.CharField(max_length=500, blank=True)
    oauth2_client_id = models.CharField(max_length=255, blank=True)
    oauth2_client_secret = models.CharField(max_length=255, blank=True)
    oauth2_access_token = models.TextField(blank=True)
    oauth2_refresh_token = models.TextField(blank=True)
    oauth2_token_expires_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.auth_type})"

    class Meta:
        ordering = ['name']

    def get_required_fields(self):
        """
        Returns the fields required for a credential set based on auth_type.
        This helps the frontend know what to ask the user for.
        """
        if self.auth_type == 'basic':
            return {
                'username': {'label': 'Username', 'type': 'text', 'required': True},
                'password': {'label': 'Password', 'type': 'password', 'required': True}
            }
        elif self.auth_type == 'api_key':
            return {
                'api_key': {'label': f'API Key (will be sent in {self.api_key_header} header)', 'type': 'password', 'required': True}
            }
        elif self.auth_type == 'bearer':
            return {
                'bearer_token': {'label': 'Bearer Token', 'type': 'password', 'required': True}
            }
        elif self.auth_type == 'oauth2':
            # OAuth2 uses Authorization Code flow - no manual input needed
            # User clicks "Authorize" button and tokens are obtained automatically
            return {}
        elif self.auth_type == 'oauth2_client_credentials':
            # OAuth2 Client Credentials flow - user provides client_id and client_secret
            # Access token is fetched automatically when API is called
            return {
                'client_id': {'label': 'Client ID', 'type': 'text', 'required': True},
                'client_secret': {'label': 'Client Secret', 'type': 'password', 'required': True},
            }
        elif self.auth_type == 'custom':
            # Parse custom_auth_config to determine fields
            # Expected format: {'fields': [{'name': 'field_name', 'label': 'Field Label', 'type': 'text', 'required': True}]}
            if self.custom_auth_config and 'fields' in self.custom_auth_config:
                fields = {}
                for field in self.custom_auth_config['fields']:
                    fields[field['name']] = {
                        'label': field.get('label', field['name']),
                        'type': field.get('type', 'text'),
                        'required': field.get('required', True)
                    }
                return fields
            return {}
        else:  # 'none'
            return {}

    def get_configuration_summary(self):
        """
        Returns a summary of the configuration (non-secret) settings.
        """
        config = {'auth_type': self.auth_type}

        if self.auth_type == 'api_key':
            config['api_key_header'] = self.api_key_header
        elif self.auth_type == 'oauth2':
            config['auth_url'] = self.oauth2_auth_url
            config['token_url'] = self.oauth2_token_url
            config['scope'] = self.oauth2_scope
            config['token_header'] = self.oauth2_token_header or 'Authorization'
            config['token_prefix'] = self.oauth2_token_prefix or 'Bearer'
        elif self.auth_type == 'oauth2_client_credentials':
            config['token_url'] = self.oauth2_token_url
            config['scope'] = self.oauth2_scope
            config['token_header'] = self.oauth2_token_header or 'Authorization'
            config['token_prefix'] = self.oauth2_token_prefix or 'Bearer'
        elif self.auth_type == 'custom':
            config['structure'] = self.custom_auth_config

        return config


class CredentialSet(models.Model):
    """
    Credential Set - actual SECRET values for a credential profile

    The credential profile (Credential model) defines the STRUCTURE/CONFIGURATION.
    The credential set stores the actual SECRET VALUES.

    Examples:

    1. API Key Profile:
       - Profile stores: api_key_header = 'X-API-Key' (configuration)
       - Credential Set stores: {'api_key': 'sk_live_abc123...'} (secret)

    2. OAuth2 Profile:
       - Profile stores: auth_url, token_url, scope (configuration)
       - Credential Set stores: {'client_id': 'xxx', 'client_secret': 'yyy'} (secrets)

    3. Basic Auth Profile:
       - Profile stores: auth_type = 'basic' (configuration)
       - Credential Set stores: {'username': 'user', 'password': 'pass'} (secrets)

    4. Bearer Token Profile:
       - Profile stores: auth_type = 'bearer' (configuration)
       - Credential Set stores: {'bearer_token': 'token123...'} (secret)

    5. Custom Auth Profile:
       - Profile stores: custom_auth_config = {'fields': [{'name': 'api_token', 'type': 'string'}]} (structure)
       - Credential Set stores: {'api_token': 'actual_token_value'} (secrets)
    """
    credential = models.ForeignKey(Credential, on_delete=models.CASCADE, related_name='credential_sets')
    name = models.CharField(max_length=100, help_text="Name for this credential set (e.g., 'Production API Key', 'Staging OAuth')")

    # The actual SECRET values stored as JSON
    # Structure depends on the credential profile's auth_type:
    # - 'basic': {'username': 'value', 'password': 'value'}
    # - 'api_key': {'api_key': 'value'} (header name comes from profile)
    # - 'bearer': {'bearer_token': 'value'}
    # - 'oauth2': {'client_id': 'value', 'client_secret': 'value'} (URLs/scope from profile)
    # - 'custom': {field_name: value, ...} (structure defined in profile's custom_auth_config)
    credential_values = models.JSONField(default=dict, help_text="Actual secret credential values")

    # Default flag - only one credential set per credential can be default
    is_default = models.BooleanField(default=False, help_text="Is this the default credential set for this profile?")

    # Owner and timestamps
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='credential_sets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        default_label = " (Default)" if self.is_default else ""
        return f"{self.credential.name} - {self.name}{default_label}"

    class Meta:
        ordering = ['-is_default', 'name']
        unique_together = ['credential', 'name']

    def save(self, *args, **kwargs):
        """Override save to ensure only one default per credential"""
        if self.is_default:
            # Unset any other defaults for this credential
            CredentialSet.objects.filter(
                credential=self.credential,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


class OAuth2State(models.Model):
    """
    Temporary storage for OAuth2 state parameters during authorization flow.

    The state parameter is used for:
    1. CSRF protection - ensures callback is from a request we initiated
    2. Context tracking - links callback to the credential profile and set name

    States are auto-cleaned after expiration.
    """
    state = models.CharField(max_length=64, unique=True, db_index=True,
                            help_text="Random unique state string for OAuth2 flow")
    credential = models.ForeignKey(Credential, on_delete=models.CASCADE,
                                   related_name='oauth2_states',
                                   help_text="Credential profile this authorization is for")
    set_name = models.CharField(max_length=100,
                               help_text="Name for the credential set to be created")
    is_default = models.BooleanField(default=False,
                                     help_text="Whether to set this as default credential set")

    # For tracking the frontend redirect after completion
    redirect_url = models.URLField(blank=True,
                                   help_text="URL to redirect user after successful authorization")

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="State expires after this time (typically 10 minutes)")

    def __str__(self):
        return f"OAuth2 State for {self.credential.name} - {self.set_name}"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['state']),
            models.Index(fields=['expires_at']),
        ]


class CustomAuthConfig(models.Model):
    """
    Configuration model for custom authentication with dynamic token fetching
    """
    VALUE_TYPES = [
        ('static', 'Static Value'),
        ('dynamic', 'Dynamic from API'),
    ]
    
    HTTP_METHODS = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('PATCH', 'PATCH'),
        ('DELETE', 'DELETE'),
    ]
    
    credential = models.ForeignKey(Credential, on_delete=models.CASCADE, related_name='custom_auth_configs')
    
    # Key-value pair definition
    key_name = models.CharField(max_length=100, help_text="Name of the authentication parameter (e.g., 'Authorization', 'X-Auth-Token')")
    value_type = models.CharField(max_length=10, choices=VALUE_TYPES, default='static')
    
    # Static value (used when value_type='static')
    static_value = models.TextField(blank=True, help_text="Static authentication value")
    
    # Dynamic API configuration (used when value_type='dynamic')
    api_url = models.URLField(blank=True, help_text="API endpoint to fetch token from")
    api_method = models.CharField(max_length=10, choices=HTTP_METHODS, default='POST', blank=True)
    api_headers = models.JSONField(default=dict, blank=True, help_text="Headers for token API request")
    api_query_params = models.JSONField(default=dict, blank=True, help_text="Query parameters for token API request")
    api_body = models.JSONField(default=dict, blank=True, help_text="Request body for token API request")
    
    # Response parsing configuration
    response_path = models.CharField(max_length=200, blank=True, 
                                   help_text="JSON path to extract token from response (e.g., 'access_token', 'data.token', 'result.auth_key')")
    
    # Token caching configuration
    cache_duration_minutes = models.IntegerField(default=60, help_text="How long to cache the fetched token (in minutes)")
    cached_token = models.TextField(blank=True, help_text="Cached token value")
    cached_at = models.DateTimeField(null=True, blank=True, help_text="When the token was cached")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.credential.name} - {self.key_name} ({self.value_type})"
    
    class Meta:
        ordering = ['credential__name', 'key_name']
        unique_together = ['credential', 'key_name']


class Connector(models.Model):
    CONNECTOR_TYPES = [
        ('system', 'System Connector'),
        ('custom', 'Custom Connector'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    base_url = models.URLField()
    credential = models.ForeignKey(Credential, on_delete=models.CASCADE, null=True, blank=True)
    connector_type = models.CharField(max_length=10, choices=CONNECTOR_TYPES, default='custom', help_text="System or custom connector")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', help_text="Active or inactive status")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        """Override save to cascade status changes to actions and validate credential sets"""
        # Check if status is changing
        if self.pk:
            old_instance = Connector.objects.get(pk=self.pk)

            # If trying to activate, check for credential sets
            if old_instance.status == 'inactive' and self.status == 'active':
                if self.credential:
                    # Check if the credential has at least one credential set
                    credential_sets_count = self.credential.credential_sets.count()
                    if credential_sets_count == 0:
                        from django.core.exceptions import ValidationError
                        raise ValidationError(
                            'Cannot activate connector: The associated credential profile must have at least one credential set. '
                            'Please create a credential set first.'
                        )

            # Check if status is changing to inactive
            if old_instance.status == 'active' and self.status == 'inactive':
                # Will cascade after save
                cascade_inactive = True
            else:
                cascade_inactive = False
        else:
            cascade_inactive = False

        super().save(*args, **kwargs)

        # Cascade inactive status to all actions
        if cascade_inactive:
            self.actions.update(status='inactive')


class ConnectorAction(models.Model):
    HTTP_METHODS = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('PATCH', 'PATCH'),
        ('DELETE', 'DELETE'),
    ]

    ACTION_TYPES = [
        ('sync', 'Synchronous'),
        ('async', 'Asynchronous'),
    ]

    ASYNC_TYPES = [
        ('polling', 'Polling-based'),
        ('webhook', 'Webhook-based'),
    ]

    ORIGIN_TYPES = [
        ('system', 'System Action'),
        ('custom', 'Custom Action'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    connector = models.ForeignKey(Connector, on_delete=models.CASCADE, related_name='actions')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    http_method = models.CharField(max_length=10, choices=HTTP_METHODS, default='GET')
    endpoint_path = models.CharField(max_length=500, help_text="Path to append to base URL with optional templates (e.g., /api/users/{userId})")

    # Action execution type
    action_type = models.CharField(max_length=10, choices=ACTION_TYPES, default='sync', help_text="Whether this action executes synchronously or asynchronously")
    # Action origin type
    origin_type = models.CharField(max_length=10, choices=ORIGIN_TYPES, default='custom', help_text="System or custom action")
    # Status
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', help_text="Active or inactive status")
    async_type = models.CharField(max_length=10, choices=ASYNC_TYPES, blank=True, null=True, help_text="Type of async execution (only for async actions)")
    
    # Enhanced JSON fields for flexible configuration with metadata
    # Path parameter support
    path_params = models.JSONField(default=dict, blank=True, help_text="Default path parameters with values")
    path_params_config = models.JSONField(default=dict, blank=True, help_text="Path parameter metadata: {param_name: {mandatory: bool, description: str}}")
    
    query_params = models.JSONField(default=dict, blank=True, help_text="Default query parameters with values")
    query_params_config = models.JSONField(default=dict, blank=True, help_text="Query parameter metadata: {param_name: {mandatory: bool, description: str}}")
    headers = models.JSONField(default=dict, blank=True, help_text="Custom headers with values")
    headers_config = models.JSONField(default=dict, blank=True, help_text="Header metadata: {header_name: {mandatory: bool, description: str}}")
    
    # Complex request body support
    request_body = models.JSONField(default=dict, blank=True, help_text="Default request body for POST/PUT/PATCH")
    request_body_template = models.JSONField(default=dict, blank=True, help_text="Request body template with parameter placeholders")
    request_body_params = models.JSONField(default=dict, blank=True, help_text="Request body parameter definitions: {param_name: {mandatory: bool, type: str, default: any, description: str}}")
    
    # Custom success logic
    enable_custom_success_logic = models.BooleanField(default=False, help_text="Enable custom success criteria evaluation")
    success_criteria = models.TextField(blank=True, help_text="Custom success criteria expression (e.g., 'status == 1 && data.documentId != null')")
    success_criteria_description = models.TextField(blank=True, help_text="Description of what constitutes a successful response")
    
    # Async polling configuration (only for polling-based async actions)
    polling_endpoint_path = models.CharField(max_length=500, blank=True, help_text="Polling endpoint path (e.g., /api/jobs/{jobId}/status)")
    polling_http_method = models.CharField(max_length=10, choices=HTTP_METHODS, default='GET', blank=True)
    
    # Polling endpoint parameters
    polling_path_params = models.JSONField(default=dict, blank=True, help_text="Default path parameters for polling endpoint")
    polling_path_params_config = models.JSONField(default=dict, blank=True, help_text="Polling path parameter metadata")
    polling_query_params = models.JSONField(default=dict, blank=True, help_text="Default query parameters for polling endpoint")
    polling_query_params_config = models.JSONField(default=dict, blank=True, help_text="Polling query parameter metadata")
    polling_headers = models.JSONField(default=dict, blank=True, help_text="Custom headers for polling endpoint")
    polling_headers_config = models.JSONField(default=dict, blank=True, help_text="Polling header metadata")
    polling_request_body = models.JSONField(default=dict, blank=True, help_text="Request body for polling endpoint")
    polling_request_body_params = models.JSONField(default=dict, blank=True, help_text="Polling request body parameter definitions")
    
    # Response parameter mapping from initial call to polling parameters
    response_to_polling_mapping = models.JSONField(default=dict, blank=True, 
        help_text="Mapping of response fields to polling parameters: {response_path: {target_type: 'path'|'query'|'header'|'body', target_param: 'param_name', json_path: 'nested.path'}}")
    
    # Polling execution configuration
    polling_frequency_seconds = models.IntegerField(default=30, help_text="Polling frequency in seconds")
    max_polling_attempts = models.IntegerField(default=10, help_text="Maximum number of polling attempts before giving up")
    
    # Success/failure criteria for async operations
    async_success_criteria = models.TextField(blank=True, help_text="Success criteria for async polling (e.g., 'data.status == \"completed\" && data.result != null')")
    async_failure_criteria = models.TextField(blank=True, help_text="Failure criteria for async polling (e.g., 'data.status == \"failed\" || data.error != null')")
    async_success_description = models.TextField(blank=True, help_text="Description of async success conditions")
    async_failure_description = models.TextField(blank=True, help_text="Description of async failure conditions")
    
    # Webhook configuration (only for webhook-based async actions)
    webhook_type = models.CharField(
        max_length=10, 
        choices=[('dynamic', 'Dynamic URL'), ('static', 'Static URL')], 
        blank=True,
        help_text="Type of webhook URL generation"
    )
    webhook_url_injection_method = models.CharField(
        max_length=10,
        choices=[('path', 'Path Parameter'), ('query', 'Query Parameter'), ('body', 'Body Parameter')],
        blank=True,
        help_text="How to inject webhook URL into initial API call"
    )
    webhook_url_injection_param = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Parameter name/path for URL injection (e.g., 'webhook_url' or 'callback.url')"
    )
    webhook_timeout_seconds = models.IntegerField(
        default=3600, 
        help_text="Timeout for webhook completion (default: 1 hour)"
    )
    
    # Static webhook specific fields
    webhook_identifier_mapping = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Mapping for static webhooks: {'initial_response_field': 'webhook_payload_field'}"
    )
    
    # Success/failure criteria for webhooks
    webhook_success_criteria = models.TextField(
        blank=True, 
        help_text="Success criteria for webhook responses (e.g., 'data.status == \"completed\"')"
    )
    webhook_failure_criteria = models.TextField(
        blank=True, 
        help_text="Failure criteria for webhook responses (e.g., 'data.status == \"failed\"')"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.connector.name} - {self.name}"

    class Meta:
        ordering = ['connector__name', 'name']
        unique_together = ['connector', 'name']


class AsyncActionExecution(models.Model):
    """
    Model to track async action executions and their polling status
    """
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('polling', 'Polling in Progress'),
        ('completed', 'Completed Successfully'),
        ('failed', 'Failed'),
        ('timeout', 'Timeout'),
        ('cancelled', 'Cancelled'),
    ]
    
    action = models.ForeignKey(ConnectorAction, on_delete=models.CASCADE, related_name='async_executions')
    execution_id = models.CharField(max_length=100, unique=True, help_text="Unique identifier for this async execution")
    
    # Initial API call details
    initial_request_params = models.JSONField(default=dict, help_text="Parameters used for initial API call")
    initial_response = models.JSONField(default=dict, help_text="Response from initial API call")
    initial_response_status = models.IntegerField(null=True, blank=True)
    initial_called_at = models.DateTimeField(auto_now_add=True)
    
    # Async execution tracking
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='initiated')
    polling_attempts = models.IntegerField(default=0, help_text="Number of polling attempts made")
    last_polling_response = models.JSONField(default=dict, help_text="Most recent polling response")
    last_polling_status = models.IntegerField(null=True, blank=True)
    last_polled_at = models.DateTimeField(null=True, blank=True)
    
    # Final results
    final_response = models.JSONField(default=dict, help_text="Final response when async operation completes")
    error_message = models.TextField(blank=True, help_text="Error message if execution failed")
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Webhook-specific fields
    webhook_url = models.URLField(
        blank=True, 
        help_text="Generated or static webhook URL for this execution"
    )
    webhook_identifier = models.CharField(
        max_length=255, 
        blank=True,
        help_text="Identifier for static webhook matching"
    )
    webhook_received = models.BooleanField(
        default=False,
        help_text="Whether webhook callback was received"
    )
    webhook_received_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When webhook callback was first received"
    )
    
    # Metadata
    workflow_execution_id = models.IntegerField(null=True, blank=True, help_text="Associated workflow execution ID")
    workflow_rule_id = models.IntegerField(null=True, blank=True, help_text="Associated workflow rule ID")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.action.name} - {self.execution_id} ({self.status})"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['execution_id']),
            models.Index(fields=['status']),
            models.Index(fields=['workflow_execution_id']),
        ]


class AsyncActionProgress(models.Model):
    """
    Model to track individual progress steps for async actions
    """
    STEP_TYPES = [
        ('initial', 'Initial API Call'),
        ('polling', 'Polling Attempt'),
        ('completion', 'Async Completion'),
        ('failure', 'Async Failure'),
        ('timeout', 'Max Attempts Reached'),
    ]
    
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    
    async_execution = models.ForeignKey(AsyncActionExecution, on_delete=models.CASCADE, related_name='progress_steps')
    step_type = models.CharField(max_length=15, choices=STEP_TYPES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='in_progress')
    
    # API call details
    endpoint_url = models.URLField()
    http_method = models.CharField(max_length=10)
    http_status_code = models.IntegerField(null=True, blank=True)
    response_time_ms = models.IntegerField(null=True, blank=True)
    
    # Request/Response details (for accordion view)
    request_headers = models.JSONField(default=dict, blank=True)
    request_params = models.JSONField(default=dict, blank=True) 
    request_body = models.JSONField(default=dict, blank=True)
    response_headers = models.JSONField(default=dict, blank=True)
    response_body = models.JSONField(default=dict, blank=True)
    
    # Progress details
    attempt_number = models.IntegerField(default=1, help_text="Which attempt this is (for polling)")
    error_message = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True, help_text="Additional progress notes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.async_execution.action.name} - {self.step_type} #{self.attempt_number}"
    
    class Meta:
        ordering = ['async_execution', 'created_at']
        indexes = [
            models.Index(fields=['async_execution', 'step_type']),
            models.Index(fields=['async_execution', 'created_at']),
        ]


class ConnectionTest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    connector = models.ForeignKey(Connector, on_delete=models.CASCADE)
    action = models.ForeignKey(ConnectorAction, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    # Test results
    response_status_code = models.IntegerField(null=True, blank=True)
    response_time_ms = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    
    tested_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Test {self.connector.name} - {self.status}"

    class Meta:
        ordering = ['-tested_at']


class Event(models.Model):
    EVENT_TYPES = [
        ('system', 'System Event'),
        ('custom', 'Custom Event'),
    ]

    name = models.CharField(max_length=100)
    event_id = models.IntegerField(unique=True, help_text="System-generated 7-digit unique identifier")
    base_event_id = models.IntegerField(null=True, blank=True, help_text="Base event ID for grouping versions together")
    version = models.IntegerField(default=1, help_text="Version number of this event")
    event_type = models.CharField(max_length=10, choices=EVENT_TYPES, default='custom')
    description = models.TextField(blank=True)

    # Event format - JSON structure defining the exact format of the event payload
    event_format = models.JSONField(default=dict, blank=True, help_text="JSON format specification for the event payload")

    # Event acknowledgement settings
    ACKNOWLEDGEMENT_TYPES = [
        ('basic', 'Basic Response'),
        ('custom', 'Custom Response'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    acknowledgement_enabled = models.BooleanField(default=False, help_text="Whether to send acknowledgement when webhook is received")
    acknowledgement_type = models.CharField(max_length=10, choices=ACKNOWLEDGEMENT_TYPES, default='basic', help_text="Type of acknowledgement response")
    acknowledgement_status_code = models.IntegerField(default=200, help_text="HTTP status code to return in acknowledgement")
    acknowledgement_payload = models.JSONField(default=dict, blank=True, help_text="Payload to send in acknowledgement response (for custom type only)")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', help_text="Event status")

    # Legacy fields (keeping for backward compatibility)
    parameters = models.JSONField(default=list, blank=True, help_text="List of parameter names in scope for this event")
    schema = models.JSONField(default=dict, blank=True, help_text="JSON schema defining event structure")

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (ID: {self.event_id})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.event_id:
            self.event_id = self._generate_event_id()
        # Set base_event_id to event_id for new events (only if not already set)
        if is_new and not self.base_event_id:
            self.base_event_id = self.event_id
        super().save(*args, **kwargs)

    def _generate_event_id(self):
        """Generate a unique 7-digit event ID"""
        import random
        while True:
            event_id = random.randint(1000000, 9999999)
            if not Event.objects.filter(event_id=event_id).exists():
                return event_id

    def get_webhook_endpoint(self):
        """Generate the webhook endpoint URL for this event"""
        return f"/api/events/{self.id}/test_webhook/"

    def get_latest_version(self):
        """Get the latest version number for this event's base_event_id"""
        return Event.objects.filter(base_event_id=self.base_event_id).aggregate(
            models.Max('version')
        )['version__max'] or 1

    def get_all_versions(self):
        """Get all versions of this event"""
        return Event.objects.filter(base_event_id=self.base_event_id).order_by('-version')

    class Meta:
        ordering = ['name', '-version']
        indexes = [
            models.Index(fields=['base_event_id', '-version']),
            models.Index(fields=['event_type', 'status']),
        ]


class Sequence(models.Model):
    SEQUENCE_TYPES = [
        ('system', 'System Sequence'),
        ('custom', 'Custom Sequence'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    name = models.CharField(max_length=100)
    sequence_id = models.IntegerField(unique=True, help_text="System-generated 7-digit unique identifier")
    sequence_type = models.CharField(max_length=10, choices=SEQUENCE_TYPES, default='custom')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    description = models.TextField(blank=True)

    # Flow data - stores the visual flow builder configuration
    flow_nodes = models.JSONField(default=list, blank=True, help_text="ReactFlow nodes configuration")
    flow_edges = models.JSONField(default=list, blank=True, help_text="ReactFlow edges configuration")
    trigger_events = models.JSONField(default=list, blank=True, help_text="Events that trigger this sequence")
    version = models.CharField(max_length=20, default='1.0', help_text="Sequence version")
    variables = models.JSONField(default=list, blank=True, help_text="Sequence variables for storing workflow data")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='sequences')

    def __str__(self):
        return f"{self.name} ({self.sequence_id})"

    def save(self, *args, **kwargs):
        if not self.sequence_id:
            self.sequence_id = self._generate_sequence_id()
        super().save(*args, **kwargs)

    def _generate_sequence_id(self):
        """Generate a unique 7-digit sequence ID"""
        import random
        while True:
            sequence_id = random.randint(1000000, 9999999)
            if not Sequence.objects.filter(sequence_id=sequence_id).exists():
                return sequence_id

    class Meta:
        ordering = ['name']


class ActivityLog(models.Model):
    """
    Tracks all CRUD operations on key entities (actions, credentials, sequences, events, connectors)
    """
    ENTITY_TYPES = [
        ('connector', 'Connector'),
        ('credential', 'Credential'),
        ('action', 'Connector Action'),
        ('event', 'Event'),
        ('sequence', 'Sequence'),
    ]

    ACTION_TYPES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('activated', 'Activated'),
        ('deactivated', 'Deactivated'),
    ]

    # Who performed the action
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    user_email = models.EmailField(blank=True, help_text="Cached email in case user is deleted")

    # What was done
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    entity_id = models.IntegerField(help_text="ID of the entity that was modified")
    entity_name = models.CharField(max_length=200, help_text="Name of the entity for quick reference")

    # Details
    message = models.TextField(help_text="Human-readable description of the action")
    changes = models.JSONField(default=dict, blank=True, help_text="Summary of what changed (before/after values)")

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    user_os = models.CharField(max_length=100, blank=True, help_text="Operating system of the user")
    user_device = models.CharField(max_length=100, blank=True, help_text="Device type (desktop, mobile, tablet, etc.)")
    user_browser = models.CharField(max_length=100, blank=True, help_text="Browser used by the user")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        user_str = self.user_email or 'System'
        return f"{user_str} {self.action_type} {self.entity_type} '{self.entity_name}' at {self.created_at}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]


class SequenceExecution(models.Model):
    """
    Tracks each execution of a sequence
    """
    STATUS_CHOICES = [
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, related_name='executions')
    execution_id = models.CharField(max_length=100, unique=True, db_index=True)

    # Trigger information
    triggered_by_event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, blank=True)
    trigger_payload = models.JSONField(default=dict, help_text="Event payload that triggered this execution")

    # Trigger source information
    trigger_ip = models.GenericIPAddressField(null=True, blank=True, help_text="IP address that triggered the event")
    trigger_os = models.CharField(max_length=100, blank=True, help_text="Operating system of the triggering device")
    trigger_device = models.CharField(max_length=100, blank=True, help_text="Device type (desktop, mobile, tablet, etc.)")
    trigger_browser = models.CharField(max_length=100, blank=True, help_text="Browser used to trigger the event")

    # Execution status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='running')
    error_message = models.TextField(blank=True)

    # Timing
    started_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True, help_text="Total execution time in milliseconds")

    # Results
    final_output = models.JSONField(default=dict, blank=True, help_text="Final output/results of the sequence")
    variables_state = models.JSONField(default=dict, blank=True, help_text="Final state of sequence variables")

    def __str__(self):
        return f"{self.sequence.name} - {self.execution_id} ({self.status})"

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['sequence', '-started_at']),
            models.Index(fields=['status', '-started_at']),
        ]


class ExecutionLog(models.Model):
    """
    Detailed logs for each node execution within a sequence execution
    """
    LOG_LEVELS = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]

    NODE_TYPES = [
        ('trigger', 'Trigger'),
        ('action', 'Action'),
        ('condition', 'Condition'),
        ('event', 'Event'),
        ('custom_rule', 'Custom Rule'),
    ]

    sequence_execution = models.ForeignKey(SequenceExecution, on_delete=models.CASCADE, related_name='logs')

    # Node information
    node_id = models.CharField(max_length=100, help_text="ID of the node in the flow")
    node_type = models.CharField(max_length=20, choices=NODE_TYPES)
    node_name = models.CharField(max_length=200, blank=True, help_text="Display name of the node")

    # Log details
    log_level = models.CharField(max_length=10, choices=LOG_LEVELS, default='info')
    message = models.TextField(help_text="Log message describing what happened")

    # Execution details
    status = models.CharField(max_length=20, default='started')  # started, completed, failed, skipped
    input_data = models.JSONField(default=dict, blank=True, help_text="Input data for this node")
    output_data = models.JSONField(default=dict, blank=True, help_text="Output data from this node")
    error_details = models.JSONField(default=dict, blank=True, help_text="Error details if node failed")

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)

    # Additional context
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional metadata like retry count, API response, etc.")

    def __str__(self):
        return f"{self.sequence_execution.execution_id} - {self.node_name} ({self.log_level})"

    class Meta:
        ordering = ['sequence_execution', 'started_at']
        indexes = [
            models.Index(fields=['sequence_execution', 'started_at']),
            models.Index(fields=['log_level', 'started_at']),
        ]
