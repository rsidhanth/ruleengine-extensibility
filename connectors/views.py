from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    AsyncActionExecution, AsyncActionProgress, Connector, Credential, CredentialSet, ConnectorAction, Event, Sequence,
    ActivityLog, SequenceExecution, ExecutionLog
)
from .serializers import (
    ConnectorSerializer, CredentialSerializer, CredentialSetSerializer, ConnectorActionSerializer, EventSerializer, SequenceSerializer,
    ActivityLogSerializer, SequenceExecutionSerializer, SequenceExecutionListSerializer, ExecutionLogSerializer
)
import json
import logging

logger = logging.getLogger(__name__)


# Basic CRUD ViewSets for frontend
class CredentialViewSet(viewsets.ModelViewSet):
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer

    @action(detail=True, methods=['get'])
    def required_fields(self, request, pk=None):
        """
        Get the required fields for creating a credential set for this profile
        """
        credential = self.get_object()
        return Response({
            'credential_id': credential.id,
            'credential_name': credential.name,
            'auth_type': credential.auth_type,
            'required_fields': credential.get_required_fields(),
            'configuration': credential.get_configuration_summary()
        })


class CredentialSetViewSet(viewsets.ModelViewSet):
    queryset = CredentialSet.objects.all()
    serializer_class = CredentialSetSerializer
    filterset_fields = ['credential', 'is_default']
    search_fields = ['name']
    ordering = ['-is_default', 'name']


class ConnectorViewSet(viewsets.ModelViewSet):
    queryset = Connector.objects.all()
    serializer_class = ConnectorSerializer

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """
        Toggle connector status between active and inactive
        """
        from django.core.exceptions import ValidationError

        connector = self.get_object()
        new_status = 'inactive' if connector.status == 'active' else 'active'
        connector.status = new_status

        try:
            connector.save()  # This will cascade to actions if changing to inactive
            serializer = self.get_serializer(connector)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e.message) if hasattr(e, 'message') else str(e)},
                status=400
            )


class ConnectorActionViewSet(viewsets.ModelViewSet):
    queryset = ConnectorAction.objects.all()
    serializer_class = ConnectorActionSerializer
    filterset_fields = ['connector', 'status', 'action_type', 'origin_type']

    def get_queryset(self):
        """
        Optionally filter actions by connector
        """
        queryset = ConnectorAction.objects.all()
        connector_id = self.request.query_params.get('connector', None)
        if connector_id is not None:
            queryset = queryset.filter(connector_id=connector_id)
        return queryset

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """
        Toggle action status between active and inactive
        """
        action = self.get_object()
        new_status = 'inactive' if action.status == 'active' else 'active'
        action.status = new_status
        action.save()
        serializer = self.get_serializer(action)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def credential_sets(self, request, pk=None):
        """
        Get available credential sets for this action (via connector's credential)
        """
        action = self.get_object()
        connector = action.connector

        if not connector.credential:
            return Response({
                'credential_sets': [],
                'message': 'No credential configured for this connector'
            })

        credential_sets = CredentialSet.objects.filter(
            credential=connector.credential
        ).order_by('-is_default', 'name')

        serializer = CredentialSetSerializer(credential_sets, many=True)
        return Response({
            'credential_sets': serializer.data,
            'credential_name': connector.credential.name,
            'connector_name': connector.name
        })


# In-memory cache for test payloads (resets on server restart)
event_test_payloads = {}


def generate_sample_from_schema(schema):
    """
    Generate a sample JSON payload from a JSON Schema.
    Converts schema metadata into actual example values.
    """
    if not schema or not isinstance(schema, dict):
        return {}

    schema_type = schema.get('type', 'object')

    if schema_type == 'object':
        sample = {}
        properties = schema.get('properties', {})

        for prop_name, prop_schema in properties.items():
            sample[prop_name] = generate_sample_from_schema(prop_schema)

        return sample

    elif schema_type == 'array':
        items_schema = schema.get('items', {'type': 'string'})
        # Generate 2 sample items for arrays
        return [
            generate_sample_from_schema(items_schema),
            generate_sample_from_schema(items_schema)
        ]

    elif schema_type == 'string':
        # Use description or label if available, otherwise use generic example
        label = schema.get('label', schema.get('description', prop_name if 'prop_name' in locals() else 'value'))
        return f"example-{label.lower().replace(' ', '-')}"

    elif schema_type == 'number' or schema_type == 'integer':
        return 0

    elif schema_type == 'boolean':
        return False

    else:
        return None


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def update(self, request, *args, **kwargs):
        """
        Override update to create a new version instead of modifying existing event
        """
        instance = self.get_object()

        # Get the latest version for this event
        latest_version = instance.get_latest_version()

        # Create new event data by copying request data
        new_event_data = request.data.copy()

        # Set version fields for new version
        new_event_data['base_event_id'] = instance.base_event_id
        new_event_data['version'] = latest_version + 1
        new_event_data['status'] = 'inactive'  # New versions start as inactive

        # Remove fields that shouldn't be copied
        new_event_data.pop('id', None)
        new_event_data.pop('event_id', None)
        new_event_data.pop('created_at', None)
        new_event_data.pop('updated_at', None)
        new_event_data.pop('created_by', None)
        new_event_data.pop('webhook_endpoint', None)
        new_event_data.pop('created_by_username', None)

        # Create the new version
        serializer = self.get_serializer(data=new_event_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """
        Toggle event status between active and inactive without creating a new version
        """
        event = self.get_object()
        event.status = 'inactive' if event.status == 'active' else 'active'
        event.save()
        serializer = self.get_serializer(event)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def test_endpoint(self, request, pk=None):
        """
        Get the test endpoint URL for this event
        """
        event = self.get_object()
        test_url = request.build_absolute_uri(f'/api/events/{event.id}/test_webhook/')
        return Response({
            'event_id': event.id,
            'event_name': event.name,
            'test_endpoint': test_url,
            'message': 'Send a POST request to this endpoint with any payload to test the event'
        })

    @action(detail=True, methods=['get'])
    def sample_payload(self, request, pk=None):
        """
        Generate a sample payload from the event's JSON schema
        """
        event = self.get_object()
        event_format = event.event_format

        if not event_format:
            return Response({
                'error': 'No event format defined for this event',
                'sample_payload': {}
            }, status=400)

        sample = generate_sample_from_schema(event_format)

        return Response({
            'event_id': event.id,
            'event_name': event.name,
            'sample_payload': sample,
            'schema': event_format  # Include schema for reference
        })

    @action(detail=True, methods=['post'])
    def test_webhook(self, request, pk=None):
        """
        Receive test payload for this event and store it in memory
        Also triggers any sequences that are listening to this event
        """
        event = self.get_object()
        payload = request.data

        # Store payload in memory with timestamp
        import datetime
        event_test_payloads[str(event.id)] = {
            'payload': payload,
            'timestamp': datetime.datetime.now().isoformat(),
            'headers': dict(request.headers),
            'method': request.method
        }

        # Trigger sequences that are listening to this event
        try:
            from .sequence_executor import SequenceExecutor
            import logging
            logger = logging.getLogger(__name__)

            # Filter sequences in Python since SQLite doesn't support __contains on JSON fields
            all_active_sequences = Sequence.objects.filter(status='active')
            sequences = [s for s in all_active_sequences if event.id in (s.trigger_events or [])]

            logger.info(f"Event {event.id} triggered. Found {len(sequences)} sequences to execute")
            for seq in sequences:
                logger.info(f"  - Sequence: {seq.name} (ID: {seq.id}, trigger_events: {seq.trigger_events})")

            for sequence in sequences:
                try:
                    executor = SequenceExecutor(
                        sequence=sequence,
                        event=event,
                        trigger_data=payload
                    )
                    # Execute asynchronously in the background
                    # For testing, we'll execute synchronously
                    executor.execute()
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to execute sequence {sequence.name}: {str(e)}", exc_info=True)
        except Exception as e:
            # Don't let sequence execution errors prevent webhook acknowledgement
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in sequence execution setup: {str(e)}", exc_info=True)

        # Return acknowledgement based on event settings
        if event.acknowledgement_enabled:
            if event.acknowledgement_type == 'custom' and event.acknowledgement_payload:
                return Response(
                    event.acknowledgement_payload,
                    status=event.acknowledgement_status_code
                )
            else:
                return Response(
                    {'status': 'received', 'message': 'Test payload received successfully'},
                    status=event.acknowledgement_status_code
                )
        else:
            return Response(
                {'status': 'received', 'message': 'Test payload received successfully'},
                status=200
            )

    @action(detail=True, methods=['get'])
    def test_payload(self, request, pk=None):
        """
        Get the latest test payload for this event
        """
        event = self.get_object()
        payload_data = event_test_payloads.get(str(event.id))

        if payload_data:
            return Response(payload_data)
        else:
            return Response(
                {'message': 'No test payload received yet. Send a POST request to the test endpoint.'},
                status=404
            )


class SequenceViewSet(viewsets.ModelViewSet):
    queryset = Sequence.objects.all()
    serializer_class = SequenceSerializer

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """
        Toggle sequence status between active and inactive
        """
        sequence = self.get_object()
        sequence.status = 'inactive' if sequence.status == 'active' else 'active'
        sequence.save()
        serializer = self.get_serializer(sequence)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """
        Execute a sequence manually (for testing)
        """
        sequence = self.get_object()

        # Check if sequence is active
        if sequence.status != 'active':
            return Response({
                'success': False,
                'error': 'Sequence must be active to execute'
            }, status=400)

        # Get trigger data from request
        trigger_data = request.data.get('trigger_data', {})

        # Execute the sequence
        from .sequence_executor import SequenceExecutor
        executor = SequenceExecutor(sequence=sequence, trigger_data=trigger_data)
        result = executor.execute()

        return Response(result)

    @action(detail=True, methods=['get'])
    def test_info(self, request, pk=None):
        """
        Get test information for a sequence including trigger event endpoints
        """
        sequence = self.get_object()

        # Get trigger events from the sequence configuration
        trigger_events = sequence.trigger_events or []

        # Build event endpoint information
        event_endpoints = []
        for event_id in trigger_events:
            try:
                event = Event.objects.get(id=event_id)
                test_url = request.build_absolute_uri(f'/api/events/{event.id}/test_webhook/')
                event_endpoints.append({
                    'event_id': event.id,
                    'event_name': event.name,
                    'event_endpoint': request.build_absolute_uri(event.get_webhook_endpoint()),
                    'test_endpoint': test_url,
                })
            except Event.DoesNotExist:
                continue

        return Response({
            'sequence_id': sequence.id,
            'sequence_name': sequence.name,
            'status': sequence.status,
            'trigger_events': event_endpoints,
            'message': 'Send a POST request to any of the test endpoints above to trigger the sequence'
        })

    @action(detail=True, methods=['get'])
    def test_status(self, request, pk=None):
        """
        Get the latest test execution status for a sequence
        """
        sequence = self.get_object()

        # Get the most recent execution for this sequence
        latest_execution = SequenceExecution.objects.filter(
            sequence=sequence
        ).order_by('-started_at').first()

        if not latest_execution:
            return Response({
                'message': 'No executions found yet. Trigger an event to start the sequence.',
                'has_execution': False
            }, status=404)

        # Get execution logs for this execution
        execution_logs = ExecutionLog.objects.filter(
            sequence_execution=latest_execution
        ).order_by('started_at')

        # Format execution logs
        logs_data = []
        for log in execution_logs:
            logs_data.append({
                'id': log.id,
                'node_id': log.node_id,
                'node_type': log.node_type,
                'node_name': log.node_name,
                'status': log.status,
                'log_level': log.log_level,
                'message': log.message,
                'duration_ms': log.duration_ms,
                'input_data': log.input_data,
                'output_data': log.output_data,
                'started_at': log.started_at.isoformat(),
            })

        return Response({
            'has_execution': True,
            'execution_id': latest_execution.execution_id,
            'status': latest_execution.status,
            'started_at': latest_execution.started_at.isoformat(),
            'completed_at': latest_execution.completed_at.isoformat() if latest_execution.completed_at else None,
            'duration_ms': latest_execution.duration_ms,
            'trigger_event': latest_execution.triggered_by_event.name if latest_execution.triggered_by_event else None,
            'trigger_payload': latest_execution.trigger_payload,
            'error_message': latest_execution.error_message,
            'final_output': latest_execution.final_output,
            'execution_logs': logs_data
        })


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
        ).order_by('started_at')
        
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
            ).order_by('started_at')
            
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


# Activity Logs Views
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing activity logs
    Read-only because logs should not be manually created/edited
    """
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    filterset_fields = ['entity_type', 'action_type', 'user']
    search_fields = ['entity_name', 'message', 'user_email']
    ordering_fields = ['created_at']
    ordering = ['-created_at']


# Execution Logs Views
class SequenceExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing sequence executions
    """
    queryset = SequenceExecution.objects.all()
    filterset_fields = ['sequence', 'status', 'triggered_by_event']
    search_fields = ['execution_id', 'sequence__name']
    ordering_fields = ['started_at', 'duration_ms']
    ordering = ['-started_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return SequenceExecutionListSerializer
        return SequenceExecutionSerializer


class ExecutionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing execution logs
    """
    queryset = ExecutionLog.objects.all()
    serializer_class = ExecutionLogSerializer
    filterset_fields = ['sequence_execution', 'log_level', 'node_type', 'status']
    search_fields = ['node_name', 'message']
    ordering_fields = ['started_at']
    ordering = ['started_at']