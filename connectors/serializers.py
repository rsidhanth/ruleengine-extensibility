from rest_framework import serializers
from .models import (
    Credential, CredentialSet, Connector, ConnectorAction, ConnectionTest, CustomAuthConfig, Event, Sequence,
    ActivityLog, SequenceExecution, ExecutionLog
)


class CredentialSetSerializer(serializers.ModelSerializer):
    credential_name = serializers.CharField(source='credential.name', read_only=True)
    credential_auth_type = serializers.CharField(source='credential.auth_type', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    token_status = serializers.SerializerMethodField()

    class Meta:
        model = CredentialSet
        fields = '__all__'
        extra_kwargs = {
            'credential_values': {'write_only': True},
        }

    def get_token_status(self, obj):
        """Get OAuth2 token status if applicable"""
        from .oauth2_service import OAuth2Service
        return OAuth2Service.get_token_status(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Mask sensitive credential values in responses
        if data.get('credential_values'):
            data['credential_values'] = '***masked***'
        return data


class CustomAuthConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomAuthConfig
        fields = '__all__'
        extra_kwargs = {
            'static_value': {'write_only': True},
            'cached_token': {'write_only': True},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Mask sensitive fields in responses
        if data.get('static_value'):
            data['static_value'] = '***masked***'
        if data.get('cached_token'):
            data['cached_token'] = '***masked***'
        return data


class CredentialSerializer(serializers.ModelSerializer):
    custom_auth_configs = CustomAuthConfigSerializer(many=True, read_only=True)
    credential_sets = CredentialSetSerializer(many=True, read_only=True)
    credential_sets_count = serializers.SerializerMethodField()
    required_fields = serializers.SerializerMethodField()
    configuration = serializers.SerializerMethodField()

    class Meta:
        model = Credential
        fields = '__all__'
        extra_kwargs = {
            # Legacy secret fields - write only for backward compatibility
            'password': {'write_only': True},
            'api_key': {'write_only': True},
            'bearer_token': {'write_only': True},
            'oauth2_client_secret': {'write_only': True},
            'oauth2_access_token': {'write_only': True},
            'oauth2_refresh_token': {'write_only': True},
        }

    def get_credential_sets_count(self, obj):
        return obj.credential_sets.count()

    def get_required_fields(self, obj):
        """Returns the fields required for creating a credential set"""
        return obj.get_required_fields()

    def get_configuration(self, obj):
        """Returns the configuration (non-secret) settings"""
        config = obj.get_configuration_summary()

        # For OAuth2, add the redirect URI that users need to register
        if obj.auth_type == 'oauth2':
            # Generate the redirect URI based on common patterns
            # This will be the actual URL when accessed via request context
            config['redirect_uri_path'] = '/api/oauth2/callback/'
            config['redirect_uri_note'] = 'Register this redirect URI in your OAuth2 provider settings'

        return config

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Mask sensitive fields in responses
        if data.get('password'):
            data['password'] = '***masked***'
        if data.get('api_key'):
            data['api_key'] = '***masked***'
        if data.get('bearer_token'):
            data['bearer_token'] = '***masked***'
        if data.get('oauth2_client_secret'):
            data['oauth2_client_secret'] = '***masked***'
        if data.get('oauth2_access_token'):
            data['oauth2_access_token'] = '***masked***'
        if data.get('oauth2_refresh_token'):
            data['oauth2_refresh_token'] = '***masked***'
        return data


class ConnectorActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectorAction
        fields = '__all__'


class ConnectorSerializer(serializers.ModelSerializer):
    actions = ConnectorActionSerializer(many=True, read_only=True)
    credential_name = serializers.CharField(source='credential.name', read_only=True)
    credential_auth_type = serializers.CharField(source='credential.auth_type', read_only=True)
    credential_sets = serializers.SerializerMethodField()
    credential_sets_count = serializers.SerializerMethodField()

    class Meta:
        model = Connector
        fields = '__all__'

    def get_credential_sets(self, obj):
        """Return list of credential sets for this connector's credential"""
        if obj.credential:
            sets = obj.credential.credential_sets.all()
            return [{'id': s.id, 'name': s.name, 'is_default': s.is_default} for s in sets]
        return []

    def get_credential_sets_count(self, obj):
        """Return count of credential sets"""
        if obj.credential:
            return obj.credential.credential_sets.count()
        return 0


class ConnectionTestSerializer(serializers.ModelSerializer):
    connector_name = serializers.CharField(source='connector.name', read_only=True)
    action_name = serializers.CharField(source='action.name', read_only=True)

    class Meta:
        model = ConnectionTest
        fields = '__all__'


class TestConnectionSerializer(serializers.Serializer):
    connector_id = serializers.IntegerField()
    action_id = serializers.IntegerField(required=False)
    custom_params = serializers.JSONField(required=False, default=dict)
    custom_headers = serializers.JSONField(required=False, default=dict)
    custom_body = serializers.JSONField(required=False, default=dict)


class TestActionSerializer(serializers.Serializer):
    """Serializer for testing actions directly (connector_id not required since action has connector)"""
    custom_params = serializers.JSONField(required=False, default=dict)
    custom_headers = serializers.JSONField(required=False, default=dict)
    custom_body = serializers.JSONField(required=False, default=dict)


class TestCustomAuthSerializer(serializers.Serializer):
    """Serializer for testing custom authentication API configurations"""
    api_url = serializers.URLField()
    api_method = serializers.ChoiceField(choices=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default='POST')
    api_headers = serializers.JSONField(required=False, default=dict)
    api_query_params = serializers.JSONField(required=False, default=dict)
    api_body = serializers.JSONField(required=False, default=dict)
    response_path = serializers.CharField(max_length=200, required=False)


# Export/Import Serializers

class CredentialProfileExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting credential profiles - excludes secrets"""
    class Meta:
        model = Credential
        exclude = ['id', 'created_at', 'updated_at', 'password', 'api_key', 'bearer_token',
                  'oauth2_client_secret', 'oauth2_access_token', 'oauth2_refresh_token',
                  'oauth2_token_expires_at']


class ConnectorActionExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting connector actions"""
    class Meta:
        model = ConnectorAction
        exclude = ['id', 'connector', 'created_at', 'updated_at']


class ConnectorExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting connectors with credential profile and actions"""
    credential_profile = CredentialProfileExportSerializer(source='credential', read_only=True)
    actions = ConnectorActionExportSerializer(many=True, read_only=True)

    class Meta:
        model = Connector
        exclude = ['id', 'credential', 'created_at', 'updated_at']


class EventExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting events"""
    class Meta:
        model = Event
        exclude = ['id', 'event_id', 'base_event_id', 'created_by', 'created_at', 'updated_at']


class SequenceExportSerializer(serializers.ModelSerializer):
    """Serializer for exporting sequences"""
    class Meta:
        model = Sequence
        exclude = ['id', 'sequence_id', 'created_by', 'created_at', 'updated_at']


class EventSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    webhook_endpoint = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ('event_id', 'created_by', 'created_at', 'updated_at')

    def get_webhook_endpoint(self, obj):
        """Return the full webhook endpoint URL"""
        request = self.context.get('request')
        if request:
            relative_url = obj.get_webhook_endpoint()
            return request.build_absolute_uri(relative_url)
        return obj.get_webhook_endpoint()


class SequenceSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)

    class Meta:
        model = Sequence
        fields = '__all__'
        read_only_fields = ('sequence_id', 'created_by', 'created_at', 'updated_at')


class ActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = '__all__'
        read_only_fields = ('created_at',)

    def get_user_email(self, obj):
        """Return cached email or user email"""
        if obj.user_email:
            return obj.user_email
        return obj.user.email if obj.user else 'abc@company.com'

    def get_user_info(self, obj):
        """Return formatted user info with IP, OS, Device, Browser"""
        parts = []
        if obj.ip_address:
            parts.append(obj.ip_address)
        if obj.user_os:
            parts.append(obj.user_os)
        if obj.user_device:
            parts.append(obj.user_device)
        if obj.user_browser:
            parts.append(obj.user_browser)
        return ' | '.join(parts) if parts else 'N/A'


class ExecutionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExecutionLog
        fields = '__all__'
        read_only_fields = ('started_at', 'completed_at', 'duration_ms')


class SequenceExecutionSerializer(serializers.ModelSerializer):
    sequence_name = serializers.CharField(source='sequence.name', read_only=True)
    sequence_id = serializers.IntegerField(source='sequence.sequence_id', read_only=True)
    event_name = serializers.CharField(source='triggered_by_event.name', read_only=True, allow_null=True)
    logs = ExecutionLogSerializer(many=True, read_only=True)
    trigger_source = serializers.SerializerMethodField()

    class Meta:
        model = SequenceExecution
        fields = '__all__'
        read_only_fields = ('started_at', 'completed_at', 'duration_ms')

    def get_trigger_source(self, obj):
        """Return formatted trigger source information"""
        parts = []
        if obj.trigger_ip:
            parts.append(obj.trigger_ip)
        if obj.trigger_os:
            parts.append(obj.trigger_os)
        if obj.trigger_device:
            parts.append(obj.trigger_device)
        if obj.trigger_browser:
            parts.append(obj.trigger_browser)
        return ' | '.join(parts) if parts else 'N/A'


class SequenceExecutionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (without logs)"""
    sequence_name = serializers.CharField(source='sequence.name', read_only=True)
    sequence_id = serializers.IntegerField(source='sequence.sequence_id', read_only=True)
    event_name = serializers.CharField(source='triggered_by_event.name', read_only=True, allow_null=True)
    log_count = serializers.SerializerMethodField()
    trigger_source = serializers.SerializerMethodField()

    class Meta:
        model = SequenceExecution
        fields = '__all__'
        read_only_fields = ('started_at', 'completed_at', 'duration_ms')

    def get_log_count(self, obj):
        return obj.logs.count()

    def get_trigger_source(self, obj):
        """Return formatted trigger source information"""
        parts = []
        if obj.trigger_ip:
            parts.append(obj.trigger_ip)
        if obj.trigger_os:
            parts.append(obj.trigger_os)
        if obj.trigger_device:
            parts.append(obj.trigger_device)
        if obj.trigger_browser:
            parts.append(obj.trigger_browser)
        return ' | '.join(parts) if parts else 'N/A'