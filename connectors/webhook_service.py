import uuid
import logging
from typing import Optional, Dict, Any, Tuple
from django.conf import settings
from django.utils import timezone
from .models import AsyncActionExecution, ConnectorAction

logger = logging.getLogger(__name__)


class WebhookService:
    """
    Service for handling webhook-based async actions including:
    - Dynamic and static webhook URL generation
    - URL injection into API calls
    - Webhook identifier extraction and matching
    - Success/failure criteria evaluation
    """
    
    def __init__(self):
        self.base_url = getattr(settings, 'WEBHOOK_BASE_URL', 'http://localhost:8001')
    
    def generate_webhook_url(self, async_execution: AsyncActionExecution, webhook_type: str) -> str:
        """
        Generate webhook URL based on type
        
        Args:
            async_execution: The async execution instance
            webhook_type: 'dynamic' or 'static'
            
        Returns:
            Generated webhook URL
        """
        if webhook_type == 'dynamic':
            return f"{self.base_url}/api/webhooks/async/{async_execution.execution_id}/"
        elif webhook_type == 'static':
            return f"{self.base_url}/api/webhooks/async/static/"
        else:
            raise ValueError(f"Unknown webhook type: {webhook_type}")
    
    def inject_webhook_url(self, action: ConnectorAction, webhook_url: str, 
                          custom_params: Dict, custom_headers: Dict, custom_body_params: Dict,
                          custom_path_params: Dict = None) -> Tuple[Dict, Dict, Dict, Dict]:
        """
        Inject webhook URL into API call parameters based on injection method
        
        Args:
            action: ConnectorAction instance
            webhook_url: The webhook URL to inject
            custom_params: Query parameters
            custom_headers: Headers
            custom_body_params: Body parameters
            custom_path_params: Path parameters
            
        Returns:
            Tuple of updated (params, headers, body_params, path_params)
        """
        injection_method = action.webhook_url_injection_method
        injection_param = action.webhook_url_injection_param
        
        if not injection_method or not injection_param:
            logger.warning(f"No webhook URL injection configured for action {action.name}")
            return custom_params, custom_headers, custom_body_params, custom_path_params or {}
        
        custom_path_params = custom_path_params or {}
        
        if injection_method == 'query':
            custom_params[injection_param] = webhook_url
            logger.info(f"Injected webhook URL into query param '{injection_param}'")
            
        elif injection_method == 'body':
            self._set_nested_value(custom_body_params, injection_param, webhook_url)
            logger.info(f"Injected webhook URL into body param '{injection_param}'")
            
        elif injection_method == 'path':
            custom_path_params[injection_param] = webhook_url
            logger.info(f"Injected webhook URL into path param '{injection_param}'")
            
        return custom_params, custom_headers, custom_body_params, custom_path_params
    
    def extract_webhook_identifier(self, action: ConnectorAction, initial_response: Dict) -> Optional[str]:
        """
        Extract identifier from initial response for static webhooks
        
        Args:
            action: ConnectorAction instance
            initial_response: Response from initial API call
            
        Returns:
            Extracted identifier string or None
        """
        if not action.webhook_identifier_mapping:
            return None
        
        for initial_field, webhook_field in action.webhook_identifier_mapping.items():
            value = self._get_nested_value(initial_response, initial_field)
            if value:
                logger.info(f"Extracted webhook identifier '{value}' from field '{initial_field}'")
                return str(value)
                
        logger.warning(f"Could not extract webhook identifier from response for action {action.name}")
        return None
    
    def find_execution_by_identifier(self, webhook_data: Dict) -> Optional[AsyncActionExecution]:
        """
        Find async execution by webhook identifier for static webhooks
        
        Args:
            webhook_data: Data received from webhook callback
            
        Returns:
            Matching AsyncActionExecution or None
        """
        # Get all pending webhook executions for static webhooks
        pending_executions = AsyncActionExecution.objects.filter(
            action__async_type='webhook',
            action__webhook_type='static',
            status__in=['initiated', 'polling'],
            webhook_received=False
        ).select_related('action')
        
        for execution in pending_executions:
            if self._matches_identifier(execution, webhook_data):
                logger.info(f"Found matching execution {execution.execution_id} for webhook data")
                return execution
                
        logger.warning("No matching execution found for webhook data")
        return None
    
    def _matches_identifier(self, execution: AsyncActionExecution, webhook_data: Dict) -> bool:
        """
        Check if webhook data matches execution identifier
        
        Args:
            execution: AsyncActionExecution instance
            webhook_data: Data from webhook callback
            
        Returns:
            True if identifiers match
        """
        if not execution.webhook_identifier:
            return False
        
        action = execution.action
        if not action.webhook_identifier_mapping:
            return False
        
        # Check if any webhook field matches our stored identifier
        for initial_field, webhook_field in action.webhook_identifier_mapping.items():
            webhook_value = self._get_nested_value(webhook_data, webhook_field)
            if webhook_value and str(webhook_value) == execution.webhook_identifier:
                logger.debug(f"Identifier match: {webhook_value} == {execution.webhook_identifier}")
                return True
                
        return False
    
    def process_webhook_completion(self, async_execution: AsyncActionExecution, 
                                 webhook_data: Dict) -> Dict[str, Any]:
        """
        Process webhook completion with success/failure criteria evaluation
        
        Args:
            async_execution: AsyncActionExecution instance
            webhook_data: Data received from webhook
            
        Returns:
            Dictionary with status and message
        """
        action = async_execution.action
        
        # Mark webhook as received
        async_execution.webhook_received = True
        async_execution.webhook_received_at = timezone.now()
        async_execution.final_response = webhook_data
        
        # Evaluate success criteria
        if action.webhook_success_criteria:
            success_met, success_msg = self._evaluate_criteria(
                action.webhook_success_criteria, webhook_data
            )
            if success_met:
                async_execution.status = 'completed'
                async_execution.completed_at = timezone.now()
                async_execution.save()
                
                logger.info(f"Webhook success criteria met for execution {async_execution.execution_id}")
                
                # Notify rule engine of completion
                self._notify_async_completion(async_execution)
                return {'status': 'completed', 'message': success_msg}
        
        # Evaluate failure criteria
        if action.webhook_failure_criteria:
            failure_met, failure_msg = self._evaluate_criteria(
                action.webhook_failure_criteria, webhook_data
            )
            if failure_met:
                async_execution.status = 'failed'
                async_execution.error_message = f'Failure criteria met: {failure_msg}'
                async_execution.completed_at = timezone.now()
                async_execution.save()
                
                logger.info(f"Webhook failure criteria met for execution {async_execution.execution_id}")
                
                # Notify rule engine of completion (even for failures)
                self._notify_async_completion(async_execution)
                return {'status': 'failed', 'message': failure_msg}
        
        # If no criteria matched, keep waiting
        async_execution.save()
        logger.info(f"Webhook received for execution {async_execution.execution_id}, waiting for completion criteria")
        return {'status': 'waiting', 'message': 'Webhook received, waiting for completion criteria'}
    
    def _evaluate_criteria(self, criteria: str, data: Dict) -> Tuple[bool, str]:
        """
        Evaluate success/failure criteria against webhook data
        
        Args:
            criteria: Criteria string (e.g., 'data.status == "completed"')
            data: Webhook data to evaluate against
            
        Returns:
            Tuple of (criteria_met: bool, message: str)
        """
        try:
            # Import the criteria evaluation logic from connectors.services
            from .services import ConnectorService
            connector_service = ConnectorService()
            return connector_service._evaluate_success_criteria(criteria, data)
        except Exception as e:
            logger.error(f"Error evaluating webhook criteria '{criteria}': {e}")
            return False, f"Criteria evaluation error: {str(e)}"
    
    def _notify_async_completion(self, async_execution: AsyncActionExecution):
        """
        Notify rule engine when async execution completes
        
        Args:
            async_execution: Completed AsyncActionExecution instance
        """
        try:
            if async_execution.workflow_execution_id:
                from workflows.rule_engine_service import RuleEngineService
                rule_engine = RuleEngineService()
                rule_engine.handle_async_completion(async_execution.execution_id)
                logger.info(f"Notified rule engine of completion for execution {async_execution.execution_id}")
        except Exception as e:
            logger.error(f"Error notifying rule engine of async completion: {e}")
    
    def _get_nested_value(self, data: Dict, path: str) -> Any:
        """
        Get nested value from dictionary using dot notation
        
        Args:
            data: Dictionary to search in
            path: Dot-separated path (e.g., 'data.document.id')
            
        Returns:
            Value at path or None if not found
        """
        try:
            keys = path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                elif isinstance(value, list) and key.isdigit():
                    value = value[int(key)]
                else:
                    return None
            return value
        except (KeyError, IndexError, ValueError, TypeError):
            return None
    
    def _set_nested_value(self, data: Dict, path: str, value: Any):
        """
        Set nested value in dictionary using dot notation
        
        Args:
            data: Dictionary to modify
            path: Dot-separated path (e.g., 'callback.url')
            value: Value to set
        """
        try:
            keys = path.split('.')
            current = data
            
            # Navigate to the parent of the final key
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
                if not isinstance(current, dict):
                    raise ValueError(f"Cannot set nested value: {key} is not a dictionary")
            
            # Set the final value
            current[keys[-1]] = value
        except Exception as e:
            logger.error(f"Error setting nested value at path '{path}': {e}")
            raise