from django.contrib import admin
from .models import Workflow, WorkflowExecution, WorkflowRule, RuleExecution


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']


@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'status', 'current_step', 'started_at']
    list_filter = ['status', 'current_step', 'started_at']
    readonly_fields = ['started_at']


@admin.register(WorkflowRule)
class WorkflowRuleAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'name', 'trigger_step', 'is_active', 'execution_order']
    list_filter = ['workflow', 'trigger_step', 'is_active']
    search_fields = ['name', 'description']


@admin.register(RuleExecution)
class RuleExecutionAdmin(admin.ModelAdmin):
    list_display = ['workflow_rule', 'status', 'execution_time_ms', 'executed_at']
    list_filter = ['status', 'executed_at']
    readonly_fields = ['executed_at']