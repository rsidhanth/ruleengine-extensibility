from django.db import models
from django.contrib.auth.models import User
import json


class Workflow(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class WorkflowExecution(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='executions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    current_step = models.IntegerField(default=1)
    
    # Step 1 data
    irn = models.CharField(max_length=100, blank=True)
    customer_id = models.CharField(max_length=100, blank=True)
    stamp_group = models.CharField(max_length=100, blank=True)
    stamp_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Step 2 data (stored as JSON for multiple entries)
    step2_data = models.JSONField(default=list, blank=True)
    
    # Execution metadata
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"{self.workflow.name} - Execution {self.id}"

    class Meta:
        ordering = ['-started_at']


class WorkflowRule(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='rules')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    rule_definition = models.TextField(help_text="Leegality rule engine rule definition")
    trigger_step = models.IntegerField(default=1, help_text="Step number when this rule should be triggered")
    is_active = models.BooleanField(default=True)
    execution_order = models.IntegerField(default=1, help_text="Order of execution if multiple rules")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.workflow.name} - {self.name}"

    class Meta:
        ordering = ['workflow', 'execution_order', 'name']
        unique_together = ['workflow', 'name']


class RuleExecution(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('error', 'Error'),
        ('warning', 'Warning'),
    ]
    
    workflow_execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='rule_executions')
    workflow_rule = models.ForeignKey(WorkflowRule, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    # Rule execution results
    execution_result = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    execution_time_ms = models.IntegerField(null=True, blank=True)
    
    # Context data that was passed to the rule
    context_data = models.JSONField(default=dict, blank=True)
    
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.workflow_rule.name} - {self.status}"

    class Meta:
        ordering = ['-executed_at']


class ApiCallLog(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('timeout', 'Timeout'),
        ('not_found', 'Action Not Found'),
        ('validation_error', 'Validation Error'),
        ('auth_error', 'Authentication Error'),
        ('network_error', 'Network Error'),
    ]
    
    # Context information
    workflow_execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE, related_name='api_call_logs', null=True, blank=True)
    workflow_rule = models.ForeignKey(WorkflowRule, on_delete=models.CASCADE, related_name='api_call_logs', null=True, blank=True)
    rule_execution = models.ForeignKey(RuleExecution, on_delete=models.CASCADE, related_name='api_call_logs', null=True, blank=True)
    
    # Action information
    action_name = models.CharField(max_length=255)
    connector_name = models.CharField(max_length=255)
    
    # Request details
    http_method = models.CharField(max_length=10)
    endpoint_url = models.URLField()
    request_headers = models.JSONField(default=dict, blank=True)
    request_params = models.JSONField(default=dict, blank=True)
    request_body = models.JSONField(default=dict, blank=True)
    
    # Response details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    http_status_code = models.IntegerField(null=True, blank=True)
    response_headers = models.JSONField(default=dict, blank=True)
    response_body = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timing information
    request_timestamp = models.DateTimeField()
    response_timestamp = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    
    # Additional context
    api_called = models.BooleanField(default=True, help_text="Whether actual HTTP call was made")
    validation_errors = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.connector_name}.{self.action_name} - {self.status} ({self.http_status_code})"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workflow_execution', '-created_at']),
            models.Index(fields=['workflow_rule', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['action_name', 'connector_name']),
        ]