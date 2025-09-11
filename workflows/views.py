from rest_framework import viewsets, status
from rest_framework.decorators import action
from django.http import JsonResponse
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models

from .models import Workflow, WorkflowExecution, WorkflowRule, RuleExecution, ApiCallLog
from .serializers import (
    WorkflowSerializer, WorkflowExecutionSerializer, WorkflowRuleSerializer,
    RuleExecutionSerializer, WorkflowExecutionCreateSerializer,
    WorkflowStep1Serializer, WorkflowStep2Serializer, ApiCallLogSerializer, ApiCallLogDetailSerializer
)
from .rule_engine_service import WorkflowRuleService


class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    
    @action(detail=True, methods=['post'])
    def create_execution(self, request, pk=None):
        """Create a new workflow execution"""
        workflow = self.get_object()
        
        execution = WorkflowExecution.objects.create(
            workflow=workflow,
            current_step=1
        )
        
        serializer = WorkflowExecutionSerializer(execution)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def create_sample_workflows(self, request):
        """Create 5 sample workflows for testing"""
        sample_workflows = [
            {
                'name': 'Loan Application Processing',
                'description': 'Process loan applications with document verification and approval workflow'
            },
            {
                'name': 'Customer Onboarding',
                'description': 'Onboard new customers with KYC verification and account setup'
            },
            {
                'name': 'Invoice Processing',
                'description': 'Process invoices with validation, approval routing, and payment initiation'
            },
            {
                'name': 'Contract Approval',
                'description': 'Review and approve contracts with legal compliance checks'
            },
            {
                'name': 'Compliance Audit',
                'description': 'Perform compliance audits with automated checks and report generation'
            }
        ]
        
        created_workflows = []
        for workflow_data in sample_workflows:
            # Check if workflow already exists
            if not Workflow.objects.filter(name=workflow_data['name']).exists():
                workflow = Workflow.objects.create(**workflow_data)
                created_workflows.append(workflow)
        
        serializer = WorkflowSerializer(created_workflows, many=True)
        return Response({
            'message': f'Created {len(created_workflows)} sample workflows',
            'workflows': serializer.data
        })


class WorkflowExecutionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowExecution.objects.all()
    serializer_class = WorkflowExecutionSerializer
    
    @action(detail=True, methods=['post'])
    def update_step1(self, request, pk=None):
        """Update step 1 data"""
        execution = self.get_object()
        serializer = WorkflowStep1Serializer(data=request.data)
        
        if serializer.is_valid():
            # Update step 1 fields
            for field, value in serializer.validated_data.items():
                setattr(execution, field, value)
            execution.save()
            
            return Response({
                'success': True,
                'message': 'Step 1 data updated successfully',
                'execution': WorkflowExecutionSerializer(execution).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def proceed_to_step2(self, request, pk=None):
        """Proceed from step 1 to step 2 and execute rules"""
        execution = self.get_object()
        
        if execution.current_step != 1:
            return Response({
                'error': 'Can only proceed from step 1'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update step 1 data if provided
        if request.data:
            step1_serializer = WorkflowStep1Serializer(data=request.data)
            if step1_serializer.is_valid():
                for field, value in step1_serializer.validated_data.items():
                    setattr(execution, field, value)
                execution.save()
            else:
                return Response(step1_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute rules for step 1
        rule_service = WorkflowRuleService()
        rule_results = rule_service.execute_workflow_rules(execution, trigger_step=1)
        
        # Save execution to persist any document changes from rule execution
        execution.save()
        
        # Check if any rules failed with detailed logging
        has_errors = False
        detailed_error_info = []
        
        print(f"DEBUG: Analyzing {len(rule_results)} rule execution results for workflow execution {execution.id}")
        
        for i, result in enumerate(rule_results):
            rule_execution = result.get('rule_execution')
            rule_result = result.get('result', {})
            
            rule_name = rule_execution.workflow_rule.name if rule_execution else f"Rule {i+1}"
            rule_success = rule_result.get('success', False)
            rule_errors = rule_result.get('result', {}).get('errors', [])
            rule_error_msg = rule_result.get('error')
            action_logs = rule_result.get('result', {}).get('action_logs', [])
            
            print(f"DEBUG: Rule '{rule_name}':")
            print(f"  - Success: {rule_success}")
            print(f"  - Direct error: {rule_error_msg}")
            print(f"  - Rule errors: {rule_errors}")
            print(f"  - Action logs count: {len(action_logs)}")
            
            # Check for action-specific failures
            failed_actions = []
            for action_log in action_logs:
                action_name = action_log.get('action_name', 'Unknown')
                connector_name = action_log.get('connector_name', 'Unknown')
                action_status = action_log.get('status', 'unknown')
                action_error = action_log.get('error')
                api_called = action_log.get('api_called', False)
                
                print(f"    - Action: {connector_name}.{action_name}")
                print(f"      Status: {action_status}, API Called: {api_called}")
                
                if action_error:
                    print(f"      Error: {action_error}")
                    failed_actions.append({
                        'action': f"{connector_name}.{action_name}",
                        'status': action_status,
                        'error': action_error,
                        'api_called': api_called
                    })
            
            # Determine if this rule has errors
            rule_has_errors = not rule_success or rule_errors or failed_actions
            if rule_has_errors:
                has_errors = True
                detailed_error_info.append({
                    'rule_name': rule_name,
                    'rule_success': rule_success,
                    'direct_error': rule_error_msg,
                    'rule_errors': rule_errors,
                    'failed_actions': failed_actions,
                    'execution_time_ms': rule_result.get('execution_time_ms', 0)
                })
                print(f"  - RULE FAILED: {rule_name}")
            else:
                print(f"  - RULE PASSED: {rule_name}")
        
        print(f"DEBUG: Overall has_errors = {has_errors}")
        
        if has_errors:
            # Build comprehensive error response
            error_messages = []
            action_failure_details = []
            
            for error_info in detailed_error_info:
                rule_name = error_info['rule_name']
                
                if error_info['direct_error']:
                    error_messages.append(f"Rule '{rule_name}': {error_info['direct_error']}")
                
                if error_info['rule_errors']:
                    for err in error_info['rule_errors']:
                        error_messages.append(f"Rule '{rule_name}': {err}")
                
                for failed_action in error_info['failed_actions']:
                    action_name = failed_action['action']
                    action_error = failed_action['error']
                    error_messages.append(f"Rule '{rule_name}' - Action '{action_name}': {action_error}")
                    action_failure_details.append({
                        'rule': rule_name,
                        'action': action_name,
                        'status': failed_action['status'],
                        'error': action_error,
                        'api_called': failed_action['api_called']
                    })
            
            print(f"ERROR: Cannot proceed to Step 2. Failures found:")
            for msg in error_messages:
                print(f"  - {msg}")
            
            return Response({
                'success': False,
                'error': 'Failed to proceed to Step 2 - Rule execution failures detected',
                'summary': f"{len(detailed_error_info)} rule(s) failed with {len(action_failure_details)} action failure(s)",
                'rule_errors': error_messages,
                'detailed_failures': detailed_error_info,
                'action_failures': action_failure_details,
                'rule_results': [r['result'] for r in rule_results]
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Move to step 2
        execution.current_step = 2
        execution.save()
        
        # Enhance rule results with async polling progress
        enhanced_rule_results = []
        for r in rule_results:
            rule_result = r['result'].copy()
            
            print(f"DEBUG: Processing rule result keys: {list(rule_result.keys())}")
            print(f"DEBUG: Has async_executions: {'async_executions' in rule_result}")
            print(f"DEBUG: action_logs length: {len(rule_result.get('action_logs', []))}")
            
            if 'async_executions' in rule_result:
                print(f"DEBUG: Async executions: {rule_result['async_executions']}")
            else:
                print(f"DEBUG: No async_executions found, full rule_result: {rule_result}")
            
            # Check if this rule has async executions and enhance action_logs
            if 'async_executions' in rule_result:
                from connectors.models import AsyncActionExecution, AsyncActionProgress
                
                enhanced_action_logs = []
                existing_action_logs = rule_result.get('action_logs', [])
                
                # Keep track of async executions we've processed
                async_execution_ids = [ae.get('execution_id') for ae in rule_result['async_executions']]
                
                for action_log in existing_action_logs:
                    enhanced_action_logs.append(action_log)
                    
                    # If this is an async action, add its polling progress
                    if (action_log.get('action_type') == 'async' and 
                        action_log.get('execution_id') in async_execution_ids):
                        
                        try:
                            async_execution = AsyncActionExecution.objects.get(
                                execution_id=action_log.get('execution_id')
                            )
                            
                            # Get all polling progress for this execution
                            progress_steps = AsyncActionProgress.objects.filter(
                                async_execution=async_execution
                            ).order_by('created_at')
                            
                            # Add each polling step as a separate action log entry
                            for step in progress_steps:
                                enhanced_action_logs.append({
                                    'action_name': f"{action_log['action_name']} (Polling #{step.attempt_number})",
                                    'connector_name': action_log['connector_name'],
                                    'action_type': 'async_polling',
                                    'status': 'success' if step.status == 'success' else 'failed',
                                    'response': step.response_body,
                                    'request_details': {
                                        'method': step.http_method,
                                        'url': step.endpoint_url,
                                        'headers': step.request_headers,
                                        'params': step.request_params,
                                        'body': step.request_body
                                    },
                                    'response_details': {
                                        'status_code': step.http_status_code,
                                        'headers': step.response_headers,
                                        'body': step.response_body
                                    },
                                    'error': step.error_message,
                                    'api_called': True,
                                    'attempt_number': step.attempt_number,
                                    'step_type': step.step_type,
                                    'created_at': step.created_at.isoformat(),
                                    'response_time_ms': step.response_time_ms
                                })
                        except AsyncActionExecution.DoesNotExist:
                            continue
                
                rule_result['action_logs'] = enhanced_action_logs
            
            enhanced_rule_results.append(rule_result)
        
        return Response({
            'success': True,
            'message': 'Proceeded to step 2 successfully',
            'execution': WorkflowExecutionSerializer(execution).data,
            'rule_results': enhanced_rule_results,
            'updated_documents': execution.step2_data or []
        })
    
    @action(detail=True, methods=['post'])
    def update_step2(self, request, pk=None):
        """Update step 2 data"""
        execution = self.get_object()
        
        if execution.current_step != 2:
            return Response({
                'error': 'Must be on step 2 to update step 2 data'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = WorkflowStep2Serializer(data=request.data)
        
        if serializer.is_valid():
            # Update step 2 data
            execution.step2_data = serializer.validated_data['documents']
            execution.save()
            
            return Response({
                'success': True,
                'message': 'Step 2 data updated successfully',
                'execution': WorkflowExecutionSerializer(execution).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def complete_workflow(self, request, pk=None):
        """Complete the workflow and execute final rules"""
        execution = self.get_object()
        
        if execution.current_step != 2:
            return Response({
                'error': 'Must be on step 2 to complete workflow'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update step 2 data if provided
        if request.data.get('documents'):
            step2_serializer = WorkflowStep2Serializer(data=request.data)
            if step2_serializer.is_valid():
                execution.step2_data = step2_serializer.validated_data['documents']
                execution.save()
            else:
                return Response(step2_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute rules for step 2
        rule_service = WorkflowRuleService()
        rule_results = rule_service.execute_workflow_rules(execution, trigger_step=2)
        
        # Check if any rules failed
        has_errors = any(
            result['result'].get('success') == False or 
            result['result'].get('result', {}).get('errors')
            for result in rule_results
        )
        
        if has_errors:
            error_messages = []
            for result in rule_results:
                if not result['result'].get('success'):
                    error_messages.append(result['result'].get('error', 'Unknown error'))
                elif result['result'].get('result', {}).get('errors'):
                    error_messages.extend(result['result']['result']['errors'])
            
            return Response({
                'success': False,
                'error': 'Final rule validation failed',
                'rule_errors': error_messages,
                'rule_results': [r['result'] for r in rule_results]
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Complete the workflow
        execution.status = 'completed'
        execution.completed_at = timezone.now()
        execution.save()
        
        # Update execution with any document changes from rules
        context_data = rule_service._prepare_context_data(execution)
        if 'documents' in context_data:
            execution.step2_data = context_data['documents']
            execution.save()

        return Response({
            'success': True,
            'message': 'Workflow completed successfully',
            'execution': WorkflowExecutionSerializer(execution).data,
            'rule_results': [r['result'] for r in rule_results],
            'updated_documents': context_data.get('documents', [])
        })
    
    @action(detail=False, methods=['get'])
    def test_async_data(self, request):
        """Test endpoint to check async execution and rule result data"""
        try:
            from connectors.models import AsyncActionExecution, AsyncActionProgress
            
            # Get the most recent async execution
            async_exec = AsyncActionExecution.objects.order_by('-created_at').first()
            if not async_exec:
                return JsonResponse({'error': 'No async executions found'})
            
            # Get progress steps
            progress_steps = AsyncActionProgress.objects.filter(
                async_execution=async_exec
            ).order_by('created_at')
            
            # Get the associated workflow execution
            workflow_exec = None
            if async_exec.workflow_execution_id:
                workflow_exec = WorkflowExecution.objects.get(id=async_exec.workflow_execution_id)
            
            return JsonResponse({
                'async_execution': {
                    'id': async_exec.execution_id,
                    'status': async_exec.status,
                    'workflow_execution_id': async_exec.workflow_execution_id,
                    'workflow_rule_id': async_exec.workflow_rule_id,
                    'polling_attempts': async_exec.polling_attempts,
                },
                'progress_steps_count': progress_steps.count(),
                'progress_steps': [
                    {
                        'id': step.id,
                        'step_type': step.step_type,
                        'attempt_number': step.attempt_number,
                        'status': step.status,
                        'endpoint_url': step.endpoint_url,
                    } for step in progress_steps
                ],
                'workflow_execution': {
                    'id': workflow_exec.id if workflow_exec else None,
                    'step2_data': workflow_exec.step2_data if workflow_exec else None,
                    'current_step': workflow_exec.current_step if workflow_exec else None,
                } if workflow_exec else None
            })
        except Exception as e:
            import traceback
            return JsonResponse({
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def test_enhanced_results(self, request):
        """Test enhanced rule results logic"""
        try:
            from connectors.models import AsyncActionExecution, AsyncActionProgress
            
            # Create a mock rule result with async_executions
            async_exec = AsyncActionExecution.objects.order_by('-created_at').first()
            if not async_exec:
                return JsonResponse({'error': 'No async executions found'})
            
            # Simulate the original action_log from rule execution
            mock_rule_result = {
                'assignments': {},
                'errors': [],
                'warnings': [],
                'action_logs': [
                    {
                        'action_name': 'Automated Sign',
                        'connector_name': 'Leegality Sandbox',
                        'action_type': 'async',
                        'execution_id': async_exec.execution_id,
                        'status': 'success',
                        'api_called': True
                    }
                ],
                'async_executions': [
                    {
                        'execution_id': async_exec.execution_id,
                        'action_name': 'Automated Sign',
                        'connector_name': 'Leegality Sandbox',
                        'async_type': async_exec.action.async_type,
                        'status': async_exec.status
                    }
                ]
            }
            
            # Apply the same enhancement logic from proceed_to_step2
            enhanced_action_logs = []
            existing_action_logs = mock_rule_result.get('action_logs', [])
            async_execution_ids = [ae.get('execution_id') for ae in mock_rule_result['async_executions']]
            
            for action_log in existing_action_logs:
                enhanced_action_logs.append(action_log)
                
                if (action_log.get('action_type') == 'async' and 
                    action_log.get('execution_id') in async_execution_ids):
                    
                    try:
                        async_execution = AsyncActionExecution.objects.get(
                            execution_id=action_log.get('execution_id')
                        )
                        
                        progress_steps = AsyncActionProgress.objects.filter(
                            async_execution=async_execution
                        ).order_by('created_at')
                        
                        for step in progress_steps:
                            enhanced_action_logs.append({
                                'action_name': f"{action_log['action_name']} (Polling #{step.attempt_number})",
                                'connector_name': action_log['connector_name'],
                                'action_type': 'async_polling',
                                'status': 'success' if step.status == 'success' else 'failed',
                                'response': step.response_body,
                                'api_called': True,
                                'attempt_number': step.attempt_number,
                                'step_type': step.step_type,
                                'created_at': step.created_at.isoformat(),
                            })
                    except AsyncActionExecution.DoesNotExist:
                        continue
            
            return JsonResponse({
                'original_action_logs_count': len(existing_action_logs),
                'enhanced_action_logs_count': len(enhanced_action_logs),
                'enhancement_added': len(enhanced_action_logs) - len(existing_action_logs),
                'enhanced_action_logs': enhanced_action_logs
            })
            
        except Exception as e:
            import traceback
            return JsonResponse({
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=500)


class WorkflowRuleViewSet(viewsets.ModelViewSet):
    serializer_class = WorkflowRuleSerializer
    
    def get_queryset(self):
        workflow_id = self.request.query_params.get('workflow_id')
        if workflow_id:
            return WorkflowRule.objects.filter(workflow_id=workflow_id)
        return WorkflowRule.objects.all()
    
    @action(detail=True, methods=['post'])
    def test_rule(self, request, pk=None):
        """Test a rule with sample data"""
        rule = self.get_object()
        
        # Get sample context data
        sample_context = request.data.get('context', {
            'irn': 'IRN001',
            'customer_id': 'CUST123',
            'stamp_group': 'GROUP_A',
            'stamp_amount': 1000.00,
            'documents': [
                {
                    'document_status': 'PENDING',
                    'document_name': 'Test Document',
                    'document_id': 'DOC123',
                    'invitee_name': 'John Doe',
                    'invitee_email': 'john@example.com'
                }
            ]
        })
        
        # Execute the rule
        rule_service = WorkflowRuleService()
        result = rule_service.rule_engine.execute_rule(rule.rule_definition, sample_context)
        
        return Response({
            'success': True,
            'rule_test_result': result,
            'sample_context': sample_context
        })


class RuleExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RuleExecution.objects.all()
    serializer_class = RuleExecutionSerializer
    
    def get_queryset(self):
        workflow_execution_id = self.request.query_params.get('workflow_execution_id')
        if workflow_execution_id:
            return self.queryset.filter(workflow_execution_id=workflow_execution_id)
        return self.queryset


class ApiCallLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ApiCallLog.objects.select_related('workflow_execution__workflow', 'workflow_rule').all()
    serializer_class = ApiCallLogSerializer
    
    def get_queryset(self):
        queryset = self.queryset
        
        # Filter by workflow execution
        workflow_execution_id = self.request.query_params.get('workflow_execution_id')
        if workflow_execution_id:
            queryset = queryset.filter(workflow_execution_id=workflow_execution_id)
        
        # Filter by workflow rule
        workflow_rule_id = self.request.query_params.get('workflow_rule_id')
        if workflow_rule_id:
            queryset = queryset.filter(workflow_rule_id=workflow_rule_id)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by action name
        action_name = self.request.query_params.get('action_name')
        if action_name:
            queryset = queryset.filter(action_name__icontains=action_name)
        
        # Filter by connector name
        connector_name = self.request.query_params.get('connector_name')
        if connector_name:
            queryset = queryset.filter(connector_name__icontains=connector_name)
            
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ApiCallLogDetailSerializer
        return ApiCallLogSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get API call statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_calls': queryset.count(),
            'success_calls': queryset.filter(status='success').count(),
            'failed_calls': queryset.filter(status='failed').count(),
            'validation_errors': queryset.filter(status='validation_error').count(),
            'timeout_errors': queryset.filter(status='timeout').count(),
            'network_errors': queryset.filter(status='network_error').count(),
            'average_duration_ms': queryset.aggregate(
                avg_duration=models.Avg('duration_ms')
            )['avg_duration'],
        }
        
        # Add success rate
        if stats['total_calls'] > 0:
            stats['success_rate'] = round((stats['success_calls'] / stats['total_calls']) * 100, 2)
        else:
            stats['success_rate'] = 0
            
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent API calls (last 24 hours)"""
        from django.utils import timezone
        from datetime import timedelta
        
        twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
        recent_calls = self.get_queryset().filter(created_at__gte=twenty_four_hours_ago)[:50]
        
        serializer = self.get_serializer(recent_calls, many=True)
        return Response({
            'count': recent_calls.count(),
            'results': serializer.data
        })