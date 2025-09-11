from django.db import models
from django.contrib.auth.models import User
import json


class Credential(models.Model):
    AUTH_TYPES = [
        ('none', 'No Authentication'),
        ('basic', 'Basic Authentication'),
        ('api_key', 'API Key'),
        ('bearer', 'Bearer Token'),
        ('oauth2', 'OAuth 2.0'),
        ('custom', 'Custom Authentication'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    auth_type = models.CharField(max_length=10, choices=AUTH_TYPES, default='none')
    
    # Basic Auth fields
    username = models.CharField(max_length=100, blank=True)
    password = models.CharField(max_length=255, blank=True)
    
    # API Key fields
    api_key = models.CharField(max_length=255, blank=True)
    api_key_header = models.CharField(max_length=50, default='X-API-Key', blank=True)
    
    # Bearer Token fields
    bearer_token = models.CharField(max_length=500, blank=True)
    
    # OAuth2 fields
    oauth2_client_id = models.CharField(max_length=255, blank=True)
    oauth2_client_secret = models.CharField(max_length=255, blank=True)
    oauth2_auth_url = models.URLField(blank=True)
    oauth2_token_url = models.URLField(blank=True)
    oauth2_scope = models.CharField(max_length=255, blank=True)
    oauth2_access_token = models.TextField(blank=True)
    oauth2_refresh_token = models.TextField(blank=True)
    oauth2_token_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Custom Auth fields - stored as JSON for flexibility
    custom_auth_config = models.JSONField(default=dict, blank=True, help_text="Custom authentication configuration")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.auth_type})"

    class Meta:
        ordering = ['name']


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
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    base_url = models.URLField()
    credential = models.ForeignKey(Credential, on_delete=models.CASCADE, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


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

    connector = models.ForeignKey(Connector, on_delete=models.CASCADE, related_name='actions')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    http_method = models.CharField(max_length=10, choices=HTTP_METHODS, default='GET')
    endpoint_path = models.CharField(max_length=500, help_text="Path to append to base URL with optional templates (e.g., /api/users/{userId})")
    
    # Action execution type
    action_type = models.CharField(max_length=10, choices=ACTION_TYPES, default='sync', help_text="Whether this action executes synchronously or asynchronously")
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
