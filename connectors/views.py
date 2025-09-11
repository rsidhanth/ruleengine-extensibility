from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from .models import AsyncActionExecution, AsyncActionProgress, Connector, Credential, ConnectorAction
from .serializers import ConnectorSerializer, CredentialSerializer, ConnectorActionSerializer
import json
import logging

logger = logging.getLogger(__name__)


# Basic CRUD ViewSets for frontend
class CredentialViewSet(viewsets.ModelViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer


class ConnectorViewSet(viewsets.ModelViewSet):
    queryset = Connector.objects.all()
    serializer_class = ConnectorSerializer


class ConnectorActionViewSet(viewsets.ModelViewSet):
    queryset = ConnectorAction.objects.all()
    serializer_class = ConnectorActionSerializer


@csrf_exempt
@require_http_methods(["GET"])
def get_async_action_progress(request, execution_id):
    """
    Get progress steps for an async action execution
    """
    try:
        async_execution = AsyncActionExecution.objects.get(execution_id=execution_id)
        
        # Get all progress steps
        progress_steps = AsyncActionProgress.objects.filter(
            async_execution=async_execution
        ).order_by('created_at')
        
        # Format progress data
        progress_data = []
        for step in progress_steps:
            progress_data.append({
                'id': step.id,
                'step_type': step.step_type,
                'step_type_display': step.get_step_type_display(),
                'status': step.status,
                'status_display': step.get_status_display(),
                'endpoint_url': step.endpoint_url,
                'http_method': step.http_method,
                'http_status_code': step.http_status_code,
                'response_time_ms': step.response_time_ms,
                'attempt_number': step.attempt_number,
                'error_message': step.error_message,
                'notes': step.notes,
                'created_at': step.created_at.isoformat(),
                'completed_at': step.completed_at.isoformat() if step.completed_at else None,
                # Request/Response details for accordion view
                'request_details': {
                    'headers': step.request_headers,
                    'params': step.request_params,
                    'body': step.request_body
                },
                'response_details': {
                    'headers': step.response_headers,
                    'body': step.response_body
                }
            })
        
        # Get execution summary
        execution_data = {
            'execution_id': async_execution.execution_id,
            'status': async_execution.status,
            'action_name': async_execution.action.name,
            'connector_name': async_execution.action.connector.name,
            'action_type': async_execution.action.action_type,
            'async_type': async_execution.action.async_type,
            'polling_attempts': async_execution.polling_attempts,
            'created_at': async_execution.created_at.isoformat(),
            'completed_at': async_execution.completed_at.isoformat() if async_execution.completed_at else None,
            'error_message': async_execution.error_message,
        }
        
        return JsonResponse({
            'success': True,
            'execution': execution_data,
            'progress_steps': progress_data
        })
        
    except AsyncActionExecution.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Async execution not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_workflow_async_progress(request, workflow_execution_id):
    """
    Get all async action progress for a workflow execution
    """
    try:
        # Get all async executions for this workflow
        async_executions = AsyncActionExecution.objects.filter(
            workflow_execution_id=workflow_execution_id
        ).order_by('-created_at')
        
        results = []
        for async_execution in async_executions:
            # Get progress steps for this execution
            progress_steps = AsyncActionProgress.objects.filter(
                async_execution=async_execution
            ).order_by('created_at')
            
            step_data = []
            for step in progress_steps:
                step_data.append({
                    'id': step.id,
                    'step_type': step.step_type,
                    'step_type_display': step.get_step_type_display(),
                    'status': step.status,
                    'status_display': step.get_status_display(),
                    'endpoint_url': step.endpoint_url,
                    'http_method': step.http_method,
                    'http_status_code': step.http_status_code,
                    'response_time_ms': step.response_time_ms,
                    'attempt_number': step.attempt_number,
                    'error_message': step.error_message,
                    'notes': step.notes,
                    'created_at': step.created_at.isoformat(),
                    'completed_at': step.completed_at.isoformat() if step.completed_at else None,
                })
            
            results.append({
                'execution_id': async_execution.execution_id,
                'status': async_execution.status,
                'action_name': async_execution.action.name,
                'connector_name': async_execution.action.connector.name,
                'created_at': async_execution.created_at.isoformat(),
                'completed_at': async_execution.completed_at.isoformat() if async_execution.completed_at else None,
                'progress_steps': step_data
            })
        
        return JsonResponse({
            'success': True,
            'async_executions': results
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_progress_step_details(request, step_id):
    """
    Get detailed request/response information for a specific progress step
    """
    try:
        step = AsyncActionProgress.objects.get(id=step_id)
        
        return JsonResponse({
            'success': True,
            'step': {
                'id': step.id,
                'step_type': step.step_type,
                'step_type_display': step.get_step_type_display(),
                'status': step.status,
                'endpoint_url': step.endpoint_url,
                'http_method': step.http_method,
                'http_status_code': step.http_status_code,
                'response_time_ms': step.response_time_ms,
                'attempt_number': step.attempt_number,
                'created_at': step.created_at.isoformat(),
                'completed_at': step.completed_at.isoformat() if step.completed_at else None,
                'request': {
                    'headers': step.request_headers,
                    'params': step.request_params,
                    'body': step.request_body
                },
                'response': {
                    'headers': step.response_headers,
                    'body': step.response_body
                },
                'error_message': step.error_message,
                'notes': step.notes
            }
        })
        
    except AsyncActionProgress.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Progress step not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def dynamic_webhook_handler(request, execution_id):
    """
    Handle webhook callbacks for dynamic webhook URLs
    Each execution has a unique webhook URL with the execution_id in the path
    """
    try:
        # Get the execution
        async_execution = AsyncActionExecution.objects.get(execution_id=execution_id)
        
        # Validate this is a webhook-based action
        if async_execution.action.async_type != 'webhook':
            return JsonResponse({
                'success': False,
                'error': 'This execution is not webhook-based'
            }, status=400)
        
        # Validate webhook type
        if async_execution.action.webhook_type != 'dynamic':
            return JsonResponse({
                'success': False,
                'error': 'This execution does not use dynamic webhooks'
            }, status=400)
        
        # Parse webhook payload
        try:
            webhook_data = json.loads(request.body.decode('utf-8')) if request.body else {}
        except json.JSONDecodeError:
            webhook_data = {}
        
        # Add request metadata to webhook data
        webhook_data['_webhook_meta'] = {
            'method': request.method,
            'headers': dict(request.headers),
            'query_params': dict(request.GET),
            'received_at': timezone.now().isoformat()
        }
        
        # Process webhook completion using WebhookService
        from .webhook_service import WebhookService
        webhook_service = WebhookService()
        result = webhook_service.process_webhook_completion(async_execution, webhook_data)
        
        logger.info(f"Dynamic webhook processed for execution {execution_id}: {result['status']}")
        
        return JsonResponse({
            'success': True,
            'message': result['message'],
            'execution_status': result['status']
        })
        
    except AsyncActionExecution.DoesNotExist:
        logger.warning(f"Dynamic webhook received for unknown execution: {execution_id}")
        return JsonResponse({
            'success': False,
            'error': 'Execution not found'
        }, status=404)
    except Exception as e:
        logger.error(f"Error processing dynamic webhook for {execution_id}: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def static_webhook_handler(request):
    """
    Handle webhook callbacks for static webhook URLs
    Uses identifier mapping to match webhook to execution
    """
    try:
        # Parse webhook payload
        try:
            webhook_data = json.loads(request.body.decode('utf-8')) if request.body else {}
        except json.JSONDecodeError:
            webhook_data = {}
        
        # Add request metadata to webhook data
        webhook_data['_webhook_meta'] = {
            'method': request.method,
            'headers': dict(request.headers),
            'query_params': dict(request.GET),
            'received_at': timezone.now().isoformat()
        }
        
        # Find matching execution using WebhookService
        from .webhook_service import WebhookService
        webhook_service = WebhookService()
        async_execution = webhook_service.find_execution_by_identifier(webhook_data)
        
        if not async_execution:
            logger.warning(f"Static webhook received but no matching execution found")
            return JsonResponse({
                'success': False,
                'error': 'No matching execution found for webhook data'
            }, status=404)
        
        # Process webhook completion
        result = webhook_service.process_webhook_completion(async_execution, webhook_data)
        
        logger.info(f"Static webhook processed for execution {async_execution.execution_id}: {result['status']}")
        
        return JsonResponse({
            'success': True,
            'message': result['message'],
            'execution_id': async_execution.execution_id,
            'execution_status': result['status']
        })
        
    except Exception as e:
        logger.error(f"Error processing static webhook: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)