from rest_framework import serializers
from .models import Workflow, WorkflowExecution, WorkflowRule, RuleExecution, ApiCallLog


class WorkflowRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowRule
        fields = '__all__'


class WorkflowSerializer(serializers.ModelSerializer):
    rules = WorkflowRuleSerializer(many=True, read_only=True)
    rules_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Workflow
        fields = '__all__'
    
    def get_rules_count(self, obj):
        return obj.rules.filter(is_active=True).count()


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    
    class Meta:
        model = WorkflowExecution
        fields = '__all__'


class RuleExecutionSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='workflow_rule.name', read_only=True)
    
    class Meta:
        model = RuleExecution
        fields = '__all__'


class WorkflowExecutionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowExecution
        fields = ['workflow']


class WorkflowStep1Serializer(serializers.Serializer):
    irn = serializers.CharField(required=False, allow_blank=True)
    customer_id = serializers.CharField(required=False, allow_blank=True)
    stamp_group = serializers.CharField(required=False, allow_blank=True)
    stamp_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)


class WorkflowStep2ItemSerializer(serializers.Serializer):
    document_status = serializers.CharField(required=False, allow_blank=True)
    document_name = serializers.CharField(required=False, allow_blank=True)
    document_id = serializers.CharField(required=False, allow_blank=True)
    invitee_name = serializers.CharField(required=False, allow_blank=True)
    invitee_email = serializers.EmailField(required=False, allow_blank=True)


class WorkflowStep2Serializer(serializers.Serializer):
    documents = WorkflowStep2ItemSerializer(many=True)


class ApiCallLogSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow_execution.workflow.name', read_only=True)
    rule_name = serializers.CharField(source='workflow_rule.name', read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = ApiCallLog
        fields = '__all__'
        
    def get_duration_seconds(self, obj):
        if obj.duration_ms:
            return round(obj.duration_ms / 1000.0, 3)
        return None


class ApiCallLogDetailSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow_execution.workflow.name', read_only=True)
    rule_name = serializers.CharField(source='workflow_rule.name', read_only=True)
    duration_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = ApiCallLog
        fields = '__all__'
        
    def get_duration_seconds(self, obj):
        if obj.duration_ms:
            return round(obj.duration_ms / 1000.0, 3)
        return None