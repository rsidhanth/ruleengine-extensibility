"""
Sequence Executor Service
Executes sequences triggered by events and logs execution details
"""
import json
import uuid
import time
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from .models import Sequence, Event, SequenceExecution, ExecutionLog, ConnectorAction
import logging

logger = logging.getLogger(__name__)


class SequenceExecutor:
    """
    Executes sequences node by node, following the flow graph
    Creates execution logs for tracking and debugging
    """

    def __init__(self, sequence, event=None, trigger_data=None):
        """
        Initialize the sequence executor

        Args:
            sequence: Sequence model instance to execute
            event: Optional Event that triggered this sequence
            trigger_data: Optional data from the trigger event
        """
        self.sequence = sequence
        self.event = event
        self.trigger_data = trigger_data or {}
        self.execution = None
        self.context = {}  # Shared context for passing data between nodes
        self.action_executor = ActionExecutor()

    def execute(self):
        """
        Execute the sequence and return the result

        Returns:
            dict: Execution result with status, output, and execution_id
        """
        execution_id = str(uuid.uuid4())
        start_time = timezone.now()

        try:
            # Create the sequence execution record
            with transaction.atomic():
                self.execution = SequenceExecution.objects.create(
                    execution_id=execution_id,
                    sequence=self.sequence,
                    triggered_by_event=self.event,
                    status='running',
                    started_at=start_time,
                    trigger_payload=self.trigger_data,
                    variables_state={}
                )

            logger.info(f"Starting sequence execution {execution_id} for sequence '{self.sequence.name}'")

            # Initialize context with trigger data
            self.context = {
                'trigger': self.trigger_data,
                'sequence': {
                    'id': self.sequence.sequence_id,
                    'name': self.sequence.name,
                },
                'execution_id': execution_id
            }

            # Parse the flow graph
            nodes_list = self.sequence.flow_nodes or []
            edges = self.sequence.flow_edges or []

            if not nodes_list:
                raise ValueError("Sequence has no nodes defined")

            # Convert nodes list to dict for easier lookup
            nodes = {node['id']: node for node in nodes_list}

            # Find the trigger/start node
            start_node = self._find_start_node(nodes)
            if not start_node:
                raise ValueError("No trigger node found in sequence")

            # Execute the flow starting from the trigger node
            result = self._execute_flow(start_node, nodes, edges)

            # Calculate duration
            end_time = timezone.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)

            # Update execution record with success
            self.execution.status = 'completed'
            self.execution.completed_at = end_time
            self.execution.duration_ms = duration_ms
            self.execution.final_output = result if result is not None else {}
            self.execution.variables_state = self.context
            self.execution.save()

            logger.info(f"Sequence execution {execution_id} completed successfully in {duration_ms}ms")

            return {
                'success': True,
                'execution_id': execution_id,
                'status': 'completed',
                'duration_ms': duration_ms,
                'output': result
            }

        except Exception as e:
            logger.error(f"Sequence execution {execution_id} failed: {str(e)}", exc_info=True)

            # Calculate duration
            end_time = timezone.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)

            # Update execution record with failure
            if self.execution:
                self.execution.status = 'failed'
                self.execution.completed_at = end_time
                self.execution.duration_ms = duration_ms
                self.execution.error_message = str(e)
                self.execution.variables_state = self.context
                self.execution.save()

            return {
                'success': False,
                'execution_id': execution_id,
                'status': 'failed',
                'duration_ms': duration_ms,
                'error': str(e)
            }

    def _find_start_node(self, nodes):
        """Find the trigger/start node in the flow"""
        for node_id, node_data in nodes.items():
            node_type = node_data.get('type', '')
            if node_type in ['event_trigger', 'trigger']:
                return node_id
        return None

    def _execute_flow(self, node_id, nodes, edges):
        """
        Execute the flow starting from a given node
        Recursively follows edges to execute subsequent nodes

        Args:
            node_id: ID of the current node to execute
            nodes: Dictionary of all nodes in the flow
            edges: List of all edges in the flow

        Returns:
            Result from the final node(s) in the flow
        """
        if node_id not in nodes:
            logger.warning(f"Node {node_id} not found in flow")
            return None

        node = nodes[node_id]
        node_type = node.get('type', '')

        # Skip trigger nodes (they just initiate the flow)
        if node_type in ['event_trigger', 'trigger']:
            # Find next nodes
            next_nodes = self._find_next_nodes(node_id, edges)
            if next_nodes:
                # Execute all next nodes (usually just one after trigger)
                results = []
                for next_node_id in next_nodes:
                    result = self._execute_flow(next_node_id, nodes, edges)
                    results.append(result)
                return results[0] if len(results) == 1 else results
            return None

        # Execute the node based on its type
        result = self._execute_node(node_id, node)

        # Handle conditions - they determine the next path
        if node_type == 'condition':
            return self._handle_condition_flow(node_id, result, nodes, edges)

        # For other nodes, follow the default edge
        next_nodes = self._find_next_nodes(node_id, edges)
        if next_nodes:
            # Execute all next nodes
            results = []
            for next_node_id in next_nodes:
                result = self._execute_flow(next_node_id, nodes, edges)
                results.append(result)
            return results[0] if len(results) == 1 else results

        # This is a terminal node, return its result
        return result

    def _execute_node(self, node_id, node):
        """
        Execute a single node and create an execution log

        Args:
            node_id: ID of the node
            node: Node data dictionary

        Returns:
            Result from the node execution
        """
        node_type = node.get('type', '')
        node_data = node.get('data', {})
        node_name = node_data.get('label', node_id)

        start_time = timezone.now()
        start_ms = time.time()

        logger.info(f"Executing node {node_id} ({node_type}): {node_name}")

        try:
            # Execute based on node type
            if node_type == 'action':
                result = self._execute_action_node(node_data)
            elif node_type == 'condition':
                result = self._execute_condition_node(node_data)
            elif node_type == 'custom_rule':
                result = self._execute_custom_rule_node(node_data)
            elif node_type == 'api_call':
                result = self._execute_api_call_node(node_data)
            else:
                result = {'success': False, 'error': f'Unknown node type: {node_type}'}

            # Calculate duration
            duration_ms = int((time.time() - start_ms) * 1000)

            # Determine log level and status
            log_level = 'success' if result.get('success', True) else 'error'
            status = 'completed' if result.get('success', True) else 'failed'

            # Create execution log
            ExecutionLog.objects.create(
                sequence_execution=self.execution,
                node_id=node_id,
                node_type=node_type,
                node_name=node_name,
                log_level=log_level,
                status=status,
                message=result.get('message', f'{node_type} executed successfully'),
                input_data=node_data,
                output_data=result,
                started_at=start_time,
                duration_ms=duration_ms
            )

            # Store result in context for next nodes
            self.context[node_id] = result

            return result

        except Exception as e:
            logger.error(f"Error executing node {node_id}: {str(e)}", exc_info=True)

            duration_ms = int((time.time() - start_ms) * 1000)

            # Create error log
            ExecutionLog.objects.create(
                sequence_execution=self.execution,
                node_id=node_id,
                node_type=node_type,
                node_name=node_name,
                log_level='error',
                status='failed',
                message=f'Error: {str(e)}',
                input_data=node_data,
                output_data={'error': str(e)},
                started_at=start_time,
                duration_ms=duration_ms
            )

            raise

    def _execute_action_node(self, node_data):
        """Execute a connector action node"""
        # Try to get actionId from nested actionConfig first (new format)
        action_config = node_data.get('actionConfig', {})
        action_id = action_config.get('actionId') or node_data.get('actionId')

        if not action_id:
            return {'success': False, 'error': 'No action ID specified'}

        try:
            action = ConnectorAction.objects.get(id=action_id)

            # Get credential set ID from actionConfig (optional)
            credential_set_id = action_config.get('credentialSetId')

            # Get parameter mappings from actionConfig
            parameter_mappings = action_config.get('parameterMappings', {})

            # Build input data from parameter mappings
            input_data = {}
            for param_type in ['path', 'query', 'headers', 'body']:
                if param_type in parameter_mappings:
                    type_params = parameter_mappings[param_type]
                    if isinstance(type_params, dict):
                        for key, value in type_params.items():
                            if not input_data.get(param_type):
                                input_data[param_type] = {}
                            input_data[param_type][key] = value

            # Fallback to old inputData format if no parameter mappings
            if not input_data:
                input_data = node_data.get('inputData', {})

            # Resolve variables in the input data
            resolved_input = self._resolve_variables(input_data)

            # Execute the action with optional credential set ID
            result = self.action_executor.execute_action(action, resolved_input, credential_set_id)

            return result

        except ConnectorAction.DoesNotExist:
            return {'success': False, 'error': f'Action {action_id} not found'}

    def _execute_condition_node(self, node_data):
        """Execute a condition node (evaluates a condition)"""
        # Handle new conditionSets format from frontend
        condition_sets = node_data.get('conditionSets', [])

        if not condition_sets:
            # Fallback to old format
            condition = node_data.get('condition', {})
            left = self._resolve_value(condition.get('left'))
            operator = condition.get('operator')
            right = self._resolve_value(condition.get('right'))
            result = self._evaluate_condition(left, operator, right)
        else:
            # Evaluate conditionSets (currently only first set, first condition)
            # TODO: Support multiple condition sets with AND/OR logic
            first_set = condition_sets[0]
            conditions = first_set.get('conditions', [])

            if not conditions:
                return {
                    'success': True,
                    'result': False,
                    'condition': {},
                    'message': 'No conditions to evaluate'
                }

            # Evaluate first condition
            cond = conditions[0]
            variable = cond.get('variable')
            operator = cond.get('operator')
            value_type = cond.get('valueType')

            # Get the variable value from context
            left_value = self._get_context_value(f'trigger.{variable}')

            # Get the comparison value
            if value_type == 'static':
                right_value = cond.get('staticValue')
                # Remove escaped quotes if present
                if isinstance(right_value, str) and right_value.startswith('"') and right_value.endswith('"'):
                    right_value = right_value[1:-1]
            else:
                # dynamic variable
                right_value = self._resolve_value(cond.get('dynamicVariable'))

            result = self._evaluate_condition(left_value, operator, right_value)

        return {
            'success': True,
            'result': result,
            'condition': {},
            'message': f'Condition evaluated to {result}'
        }

    def _execute_custom_rule_node(self, node_data):
        """Execute a custom rule node (DSL-based logic)"""
        # Frontend stores DSL in customRuleConfig.code
        custom_rule_config = node_data.get('customRuleConfig', {})
        dsl = custom_rule_config.get('code', '') or node_data.get('dsl', '')

        if not dsl or not dsl.strip():
            return {
                'success': False,
                'error': 'No DSL provided in custom rule node'
            }

        try:
            # Import the rule engine
            from workflows.rule_engine_service import SimpleRuleEngine

            # Create rule engine instance
            rule_engine = SimpleRuleEngine()

            # Debug: Log the current context structure
            logger.info(f"Custom rule context keys: {list(self.context.keys())}")
            for key, value in self.context.items():
                if isinstance(value, dict):
                    logger.info(f"Context[{key}] has keys: {list(value.keys())}")
                    if 'body' in value:
                        logger.info(f"Context[{key}]['body']: {value['body']}")
                    if 'data' in value:
                        logger.info(f"Context[{key}]['data']: {value['data']}")

            # Execute the DSL with current context
            result = rule_engine.execute_rule(
                rule_definition=dsl,
                context_data=self.context,
                workflow_execution=None,
                workflow_rule=None,
                rule_execution=None
            )

            logger.info(f"Custom rule DSL execution result: {result}")

            # Apply any assignments from the rule back to the context
            if result.get('success') and result.get('assignments'):
                for key, value in result['assignments'].items():
                    self.context[key] = value
                    logger.info(f"Applied assignment from rule: {key} = {value}")

            # Return the result
            return {
                'success': result.get('success', False),
                'result': result.get('result', {}),
                'assignments': result.get('assignments', {}),
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', []),
                'message': 'Custom rule executed successfully' if result.get('success') else 'Custom rule execution failed'
            }

        except Exception as e:
            logger.error(f"Error executing custom rule DSL: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Custom rule execution error: {str(e)}'
            }

    def _execute_api_call_node(self, node_data):
        """Execute a direct API call node"""
        # TODO: Implement direct API call execution
        return {
            'success': True,
            'message': 'API call executed (not yet fully implemented)'
        }

    def _handle_condition_flow(self, node_id, condition_result, nodes, edges):
        """
        Handle flow branching based on condition result

        Args:
            node_id: ID of the condition node
            condition_result: Result from condition evaluation
            nodes: All nodes in the flow
            edges: All edges in the flow

        Returns:
            Result from the branch that was taken
        """
        # Find edges from this condition
        outgoing_edges = [e for e in edges if e.get('source') == node_id]
        logger.info(f"Condition node {node_id} has {len(outgoing_edges)} outgoing edges")

        # Determine which branch to take
        branch_result = condition_result.get('result', False)
        logger.info(f"Condition evaluated to: {branch_result}")

        # Look for TRUE and FALSE/ELSE branches using sourceHandle
        # ReactFlow condition nodes use sourceHandle to identify branches:
        # - "set-0", "set-1", etc. for TRUE branches (condition sets)
        # - "else" for FALSE/ELSE branch
        true_edges = []
        false_edge = None

        for edge in outgoing_edges:
            source_handle = edge.get('sourceHandle', '')
            logger.info(f"Edge from {node_id} to {edge.get('target')} - sourceHandle: '{source_handle}'")

            if source_handle == 'else':
                false_edge = edge
                logger.info(f"Found FALSE/ELSE edge to {edge.get('target')}")
            elif source_handle and source_handle.startswith('set-'):
                true_edges.append(edge)
                logger.info(f"Found TRUE edge (set) to {edge.get('target')}")

        # Execute the appropriate branch
        if branch_result:
            # Condition is TRUE - take a true branch
            if true_edges:
                # Take the first true edge (set-0)
                target = true_edges[0].get('target')
                logger.info(f"Taking TRUE branch to node {target}")
                return self._execute_flow(target, nodes, edges)
            # If no true edge but has outgoing edges, take the first one
            elif outgoing_edges:
                target = outgoing_edges[0].get('target')
                logger.info(f"No TRUE edge found, taking first available edge to node {target}")
                return self._execute_flow(target, nodes, edges)
        else:
            # Condition is FALSE - take the else branch
            if false_edge:
                target = false_edge.get('target')
                logger.info(f"Taking FALSE/ELSE branch to node {target}")
                return self._execute_flow(target, nodes, edges)
            else:
                logger.info(f"Condition is FALSE but no ELSE edge found. Available sourceHandles: {[e.get('sourceHandle', 'none') for e in outgoing_edges]}")

        logger.info(f"No branch taken for condition node {node_id}")
        return None

    def _find_next_nodes(self, node_id, edges):
        """Find all nodes connected from the given node"""
        next_nodes = []
        for edge in edges:
            if edge.get('source') == node_id:
                target = edge.get('target')
                if target:
                    next_nodes.append(target)
        return next_nodes

    def _resolve_variables(self, data):
        """
        Resolve variable references in data
        Variables can reference trigger data or previous node outputs

        Handles two formats:
        1. Template syntax: "{{trigger.field}}" or "{{node_123.output}}"
        2. Metadata structure: {"type": "variable", "value": "@event.field"}
        """
        if isinstance(data, dict):
            # Check if this is a variable reference structure
            if data.get('type') == 'variable' and 'value' in data:
                # This is a variable reference - resolve it
                var_ref = data['value']
                logger.info(f"Resolving variable reference: {var_ref}")

                # Handle @event.field or @context.field references
                if var_ref.startswith('@'):
                    # Remove @ prefix
                    attr_path = var_ref[1:]

                    # Handle @event as a special case - it maps to trigger
                    if attr_path.startswith('event.'):
                        attr_path = 'trigger.' + attr_path[6:]  # Replace 'event.' with 'trigger.'

                    resolved_value = self._get_context_value(attr_path)
                    logger.info(f"Resolved {var_ref} to: {resolved_value}")
                    return resolved_value
                else:
                    # Direct context lookup
                    resolved_value = self._get_context_value(var_ref)
                    logger.info(f"Resolved {var_ref} to: {resolved_value}")
                    return resolved_value
            else:
                # Regular dict - recurse into each value
                return {k: self._resolve_variables(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._resolve_variables(item) for item in data]
        elif isinstance(data, str) and data.startswith('{{') and data.endswith('}}'):
            # Variable reference like {{trigger.user_id}} or {{node_123.output}}
            var_path = data[2:-2].strip()
            return self._get_context_value(var_path)
        return data

    def _resolve_value(self, value):
        """Resolve a single value (could be a variable reference or literal)"""
        if isinstance(value, str) and value.startswith('{{') and value.endswith('}}'):
            var_path = value[2:-2].strip()
            return self._get_context_value(var_path)
        return value

    def _get_context_value(self, path):
        """
        Get a value from context using dot notation
        E.g., 'trigger.user_id' or 'node_123.output.status'
        """
        parts = path.split('.')
        value = self.context

        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None

        return value

    def _evaluate_condition(self, left, operator, right):
        """
        Evaluate a condition

        Args:
            left: Left operand
            operator: Comparison operator
            right: Right operand

        Returns:
            bool: Result of the condition
        """
        if operator == 'equals' or operator == '==':
            return left == right
        elif operator == 'not_equals' or operator == '!=':
            return left != right
        elif operator == 'greater_than' or operator == '>':
            return left > right
        elif operator == 'less_than' or operator == '<':
            return left < right
        elif operator == 'greater_than_or_equal' or operator == '>=':
            return left >= right
        elif operator == 'less_than_or_equal' or operator == '<=':
            return left <= right
        elif operator == 'contains':
            return right in left if isinstance(left, (str, list)) else False
        elif operator == 'not_contains':
            return right not in left if isinstance(left, (str, list)) else True
        else:
            logger.warning(f"Unknown operator: {operator}")
            return False


class ActionExecutor:
    """
    Helper class to execute connector actions
    """

    def __init__(self):
        from .services import ConnectorService
        self.connector_service = ConnectorService()

    def execute_action(self, action, input_data, credential_set_id=None):
        """
        Execute a connector action

        Args:
            action: ConnectorAction model instance
            input_data: Input data for the action (dict with path, query, headers, body)
            credential_set_id: Optional ID of the credential set to use

        Returns:
            dict: Action execution result
        """
        logger.info(f"Executing action: {action.name}")

        try:
            connector = action.connector

            # Extract parameters from input_data structure
            custom_path_params = input_data.get('path', {})
            custom_params = input_data.get('query', {})
            custom_headers = input_data.get('headers', {})
            custom_body_params = input_data.get('body', {})

            # Execute the action using ConnectorService
            result = self.connector_service.execute_action(
                connector=connector,
                action=action,
                custom_params=custom_params,
                custom_headers=custom_headers,
                custom_body=None,  # We're using custom_body_params instead
                custom_body_params=custom_body_params,
                custom_path_params=custom_path_params,
                workflow_execution=None,  # No workflow context for sequence execution
                workflow_rule=None,
                rule_execution=None,
                credential_set_id=credential_set_id
            )

            return result

        except Exception as e:
            logger.error(f"Error executing action {action.name}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Action execution failed: {str(e)}'
            }
