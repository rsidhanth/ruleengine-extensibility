from rest_framework import serializers
from .models import Credential, Connector, ConnectorAction, ConnectionTest, CustomAuthConfig


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
    class Meta:
        model = Credential
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True},
            'api_key': {'write_only': True},
            'bearer_token': {'write_only': True},
            'oauth2_client_secret': {'write_only': True},
            'oauth2_access_token': {'write_only': True},
            'oauth2_refresh_token': {'write_only': True},
        }

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

    class Meta:
        model = Connector
        fields = '__all__'


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