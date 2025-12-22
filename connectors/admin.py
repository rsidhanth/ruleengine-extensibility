from django.contrib import admin
from .models import (
    Credential, CredentialSet, Connector, ConnectorAction, ConnectionTest, Event, Sequence,
    ActivityLog, SequenceExecution, ExecutionLog
)


class CredentialSetInline(admin.TabularInline):
    model = CredentialSet
    extra = 0
    fields = ('name', 'is_default', 'created_by', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display = ('name', 'auth_type', 'credential_type', 'created_at')
    list_filter = ('auth_type', 'credential_type', 'created_at')
    search_fields = ('name', 'description')
    fields = ('name', 'description', 'auth_type', 'credential_type', 'username', 'password', 'api_key', 'api_key_header', 'bearer_token')
    inlines = [CredentialSetInline]


@admin.register(CredentialSet)
class CredentialSetAdmin(admin.ModelAdmin):
    list_display = ('name', 'credential', 'is_default', 'created_by', 'created_at')
    list_filter = ('is_default', 'created_at')
    search_fields = ('name', 'credential__name')
    readonly_fields = ('created_at', 'updated_at')


class ConnectorActionInline(admin.TabularInline):
    model = ConnectorAction
    extra = 1


@admin.register(Connector)
class ConnectorAdmin(admin.ModelAdmin):
    list_display = ('name', 'connector_type', 'status', 'base_url', 'credential', 'created_at')
    list_filter = ('connector_type', 'status', 'created_at')
    search_fields = ('name', 'description', 'base_url')
    inlines = [ConnectorActionInline]


@admin.register(ConnectorAction)
class ConnectorActionAdmin(admin.ModelAdmin):
    list_display = ('name', 'connector', 'origin_type', 'status', 'http_method', 'endpoint_path', 'created_at')
    list_filter = ('origin_type', 'status', 'http_method', 'created_at')
    search_fields = ('name', 'description', 'endpoint_path')


@admin.register(ConnectionTest)
class ConnectionTestAdmin(admin.ModelAdmin):
    list_display = ('connector', 'action', 'status', 'response_status_code', 'response_time_ms', 'tested_at')
    list_filter = ('status', 'tested_at')
    readonly_fields = ('tested_at',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_id', 'event_type', 'created_by', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('name', 'event_id', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Sequence)
class SequenceAdmin(admin.ModelAdmin):
    list_display = ('name', 'sequence_id', 'sequence_type', 'status', 'created_by', 'created_at')
    list_filter = ('sequence_type', 'status', 'created_at')
    search_fields = ('name', 'sequence_id', 'description')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'entity_type', 'action_type', 'entity_name', 'created_at')
    list_filter = ('entity_type', 'action_type', 'created_at')
    search_fields = ('entity_name', 'message', 'user_email')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'


class ExecutionLogInline(admin.TabularInline):
    model = ExecutionLog
    extra = 0
    readonly_fields = ('started_at', 'completed_at', 'duration_ms')
    fields = ('node_name', 'node_type', 'log_level', 'status', 'message', 'duration_ms')


@admin.register(SequenceExecution)
class SequenceExecutionAdmin(admin.ModelAdmin):
    list_display = ('execution_id', 'sequence', 'status', 'triggered_by_event', 'started_at', 'duration_ms')
    list_filter = ('status', 'started_at')
    search_fields = ('execution_id', 'sequence__name')
    readonly_fields = ('started_at', 'completed_at', 'duration_ms')
    inlines = [ExecutionLogInline]
    date_hierarchy = 'started_at'


@admin.register(ExecutionLog)
class ExecutionLogAdmin(admin.ModelAdmin):
    list_display = ('sequence_execution', 'node_name', 'node_type', 'log_level', 'status', 'started_at', 'duration_ms')
    list_filter = ('log_level', 'node_type', 'status', 'started_at')
    search_fields = ('node_name', 'message', 'sequence_execution__execution_id')
    readonly_fields = ('started_at', 'completed_at', 'duration_ms')
    date_hierarchy = 'started_at'
