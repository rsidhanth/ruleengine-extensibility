from django.contrib import admin
from .models import Credential, Connector, ConnectorAction, ConnectionTest


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display = ('name', 'auth_type', 'created_at')
    list_filter = ('auth_type', 'created_at')
    search_fields = ('name', 'description')
    fields = ('name', 'description', 'auth_type', 'username', 'password', 'api_key', 'api_key_header', 'bearer_token')


class ConnectorActionInline(admin.TabularInline):
    model = ConnectorAction
    extra = 1


@admin.register(Connector)
class ConnectorAdmin(admin.ModelAdmin):
    list_display = ('name', 'base_url', 'credential', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'description', 'base_url')
    inlines = [ConnectorActionInline]


@admin.register(ConnectorAction)
class ConnectorActionAdmin(admin.ModelAdmin):
    list_display = ('name', 'connector', 'http_method', 'endpoint_path', 'created_at')
    list_filter = ('http_method', 'created_at')
    search_fields = ('name', 'description', 'endpoint_path')


@admin.register(ConnectionTest)
class ConnectionTestAdmin(admin.ModelAdmin):
    list_display = ('connector', 'action', 'status', 'response_status_code', 'response_time_ms', 'tested_at')
    list_filter = ('status', 'tested_at')
    readonly_fields = ('tested_at',)
