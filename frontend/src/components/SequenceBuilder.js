import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Button as MuiButton,
} from '@mui/material';
import {
  Button as LeegalityButton,
  ButtonTypes,
  ButtonSizes,
  Badge,
  BadgeTypes,
  BadgeSizes,
} from '@leegality/leegality-react-component-library';
import LeegalityIcon from '@leegality/leegality-react-component-library/dist/icon';
import notification from '@leegality/leegality-react-component-library/dist/notification';
import {
  X as CloseIconFeather,
  Save as SaveIconFeather,
  GitBranch as ApiIcon,
  GitMerge as ConditionIcon,
  Code as DslIcon,
  GitPullRequest as MergeIcon,
  Zap as EventIcon,
  Layers as ParallelIcon,
  Plus as PlusIcon,
  Eye as EyeIcon,
} from 'react-feather';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { eventsApi, sequencesApi } from '../services/api';
import ConditionNode from './nodes/ConditionNode';
import APINode from './nodes/APINode';
import ActionNode from './nodes/ActionNode';
import EventTriggerNode from './nodes/EventTriggerNode';
import EventNode from './nodes/EventNode';
import CustomRuleNode from './nodes/CustomRuleNode';
import ParallelNode from './nodes/ParallelNode';
import MergeNode from './nodes/MergeNode';
import ConditionConfigDrawer from './ConditionConfigDrawer';
import APIConfigDrawer from './APIConfigDrawer';
import ActionConfigDrawer from './ActionConfigDrawer';
import EventDetailsDrawer from './EventDetailsDrawer';
import EventConfigDrawer from './EventConfigDrawer';
import DSLConfigDrawer from './DSLConfigDrawer';
import VariableCreateModal from './VariableCreateModal';
import VariableListModal from './VariableListModal';

// Icon render helper for Leegality components
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <LeegalityIcon icon={IconComponent} size={size} color={color} /> : null;

const nodeTypes = [
  {
    type: 'action',
    label: 'Action',
    description: 'Execute a connector action',
    icon: <ApiIcon size={16} />,
    color: '#8b5cf6'
  },
  {
    type: 'event',
    label: 'Event',
    description: 'Trigger events to start sequences',
    icon: <EventIcon size={16} />,
    color: '#ec4899'
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch flow based on conditions',
    icon: <ConditionIcon size={16} />,
    color: '#10b981'
  },
  {
    type: 'custom_rule',
    label: 'Custom Rule',
    description: 'Run custom DSL script logic',
    icon: <DslIcon size={16} />,
    color: '#3b82f6'
  },
  {
    type: 'parallel',
    label: 'Parallel',
    description: 'Execute branches in parallel',
    icon: <ParallelIcon size={16} />,
    color: '#f59e0b'
  },
  {
    type: 'merge',
    label: 'Merge',
    description: 'Wait for parallel branches to complete',
    icon: <MergeIcon size={16} />,
    color: '#06b6d4'
  },
];

const SequenceBuilder = ({ sequenceData, onSave, onClose }) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [nodeIdCounter, setNodeIdCounter] = useState(2);
  const [version, setVersion] = useState('1.0');
  const [showEventPayload, setShowEventPayload] = useState(false);
  const [triggerEvents, setTriggerEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);

  // Drawer states for node configuration
  const [conditionDrawerOpen, setConditionDrawerOpen] = useState(false);
  const [apiDrawerOpen, setApiDrawerOpen] = useState(false);
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false);
  const [dslDrawerOpen, setDslDrawerOpen] = useState(false);
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState(null);
  const [eventDetailsDrawerOpen, setEventDetailsDrawerOpen] = useState(false);

  // Debug: Log when dslDrawerOpen changes
  useEffect(() => {
    console.log('dslDrawerOpen state changed to:', dslDrawerOpen);
  }, [dslDrawerOpen]);

  // Variables state
  const [variables, setVariables] = useState([]);
  const [showVariableCreateModal, setShowVariableCreateModal] = useState(false);
  const [showVariableListModal, setShowVariableListModal] = useState(false);

  // Define custom node types for React Flow (memoized to prevent recreation)
  const customNodeTypes = React.useMemo(() => ({
    condition: ConditionNode,
    api_call: APINode,
    action: ActionNode,
    event_trigger: EventTriggerNode,
    event: EventNode,
    custom_rule: CustomRuleNode,
    parallel: ParallelNode,
    merge: MergeNode,
  }), []);


  // Load events
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await eventsApi.getAll();
      setAllEvents(response.data);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  };

  // Initialize trigger events from sequenceData
  useEffect(() => {
    if (sequenceData && sequenceData.trigger_events && allEvents.length > 0) {
      const eventIds = Array.isArray(sequenceData.trigger_events)
        ? sequenceData.trigger_events
        : [sequenceData.trigger_events];

      const selectedEvents = allEvents.filter(e => eventIds.includes(e.id));
      if (selectedEvents.length > 0) {
        setTriggerEvents(selectedEvents);
      }
    }
  }, [sequenceData, allEvents]);

  // Initialize variables from sequenceData
  useEffect(() => {
    if (sequenceData && sequenceData.variables) {
      setVariables(Array.isArray(sequenceData.variables) ? sequenceData.variables : []);
    }
  }, [sequenceData]);

  // Handlers for node configuration (defined before useEffect that uses it)
  const handleNodeSettingsClick = useCallback((nodeId, nodeData) => {
    console.log('handleNodeSettingsClick called with:', { nodeId, nodeData, nodeType: nodeData?.nodeType });

    // Add null check for nodeData
    if (!nodeData) {
      console.error('nodeData is undefined or null in handleNodeSettingsClick', { nodeId });
      notification.error('Node configuration data is missing', 'Please try refreshing the page.');
      return;
    }

    if (!nodeData.nodeType) {
      console.error('nodeType is missing from nodeData', { nodeId, nodeData });
      notification.error('Node type is missing', 'Please try recreating this node.');
      return;
    }

    // Create a node-like object from the parameters (don't need to look it up)
    const nodeForConfig = {
      id: nodeId,
      data: nodeData
    };

    setSelectedNodeForConfig(nodeForConfig);

    // Open appropriate drawer based on node type
    if (nodeData.nodeType === 'condition') {
      console.log('Opening condition drawer');
      setConditionDrawerOpen(true);
    } else if (nodeData.nodeType === 'api_call') {
      console.log('Opening api drawer');
      setApiDrawerOpen(true);
    } else if (nodeData.nodeType === 'action') {
      console.log('Opening action drawer');
      setActionDrawerOpen(true);
    } else if (nodeData.nodeType === 'event') {
      console.log('Opening event drawer');
      setEventDrawerOpen(true);
    } else if (nodeData.nodeType === 'custom_rule') {
      console.log('Opening DSL drawer for custom rule');
      setDslDrawerOpen(true);
    } else {
      console.log('Unknown node type:', nodeData.nodeType);
    }
  }, []);

  const handleConditionSave = useCallback((updatedData) => {
    if (!selectedNodeForConfig) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeForConfig.id) {
          return {
            ...node,
            data: {
              ...updatedData,
              onSettingsClick: handleNodeSettingsClick,
            },
          };
        }
        return node;
      })
    );

    setConditionDrawerOpen(false);
    setSelectedNodeForConfig(null);
  }, [selectedNodeForConfig, setNodes, handleNodeSettingsClick]);

  const handleApiSave = useCallback((updatedData) => {
    if (!selectedNodeForConfig) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeForConfig.id) {
          return {
            ...node,
            data: {
              ...updatedData,
              onSettingsClick: handleNodeSettingsClick,
            },
          };
        }
        return node;
      })
    );

    setApiDrawerOpen(false);
    setSelectedNodeForConfig(null);
  }, [selectedNodeForConfig, setNodes, handleNodeSettingsClick]);

  const handleActionSave = useCallback((updatedData) => {
    if (!selectedNodeForConfig) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeForConfig.id) {
          return {
            ...node,
            data: {
              ...updatedData,
              onSettingsClick: handleNodeSettingsClick,
            },
          };
        }
        return node;
      })
    );

    setActionDrawerOpen(false);
    setSelectedNodeForConfig(null);
  }, [selectedNodeForConfig, setNodes, handleNodeSettingsClick]);

  const handleEventSave = useCallback((updatedData) => {
    if (!selectedNodeForConfig) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeForConfig.id) {
          return {
            ...node,
            data: {
              ...updatedData,
              onSettingsClick: handleNodeSettingsClick,
            },
          };
        }
        return node;
      })
    );

    setEventDrawerOpen(false);
    setSelectedNodeForConfig(null);
  }, [selectedNodeForConfig, setNodes, handleNodeSettingsClick]);

  const handleDslSave = useCallback((updatedData) => {
    if (!selectedNodeForConfig) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeForConfig.id) {
          return {
            ...node,
            data: {
              ...updatedData,
              onSettingsClick: handleNodeSettingsClick,
            },
          };
        }
        return node;
      })
    );

    setDslDrawerOpen(false);
    setSelectedNodeForConfig(null);
  }, [selectedNodeForConfig, setNodes, handleNodeSettingsClick]);

  // Load existing flow data from sequenceData (for editing)
  useEffect(() => {
    if (sequenceData && sequenceData.flow_nodes && sequenceData.flow_nodes.length > 0) {
      // Load existing nodes and edges
      console.log('Loading nodes from sequenceData:', sequenceData.flow_nodes);
      setNodes(sequenceData.flow_nodes.map(node => {
        // Clean up any serialized React elements or invalid data
        const cleanData = { ...node.data };
        // Remove label if it's an object (serialized React element)
        if (cleanData.label && typeof cleanData.label === 'object') {
          delete cleanData.label;
        }

        // Special handling for trigger node
        if (node.type === 'event_trigger' || node.id === 'trigger_node') {
          return {
            ...node,
            data: {
              ...cleanData,
              triggerEvents: triggerEvents.length > 0 ? triggerEvents : cleanData.triggerEvents || [],
              onSettingsClick: () => setEventDetailsDrawerOpen(true),
              onEditClick: () => setShowEventSelector(!showEventSelector),
              onViewAllClick: () => setShowAllEventsModal(true),
            }
          };
        }

        // Regular nodes get the standard handler
        return {
          ...node,
          data: {
            ...cleanData,
            onSettingsClick: handleNodeSettingsClick,
          }
        };
      }));

      if (sequenceData.flow_edges && sequenceData.flow_edges.length > 0) {
        setEdges(sequenceData.flow_edges);
      }

      if (sequenceData.version) {
        setVersion(sequenceData.version);
      }

      // Update nodeIdCounter to be higher than any existing node ID
      const maxNodeId = sequenceData.flow_nodes.reduce((max, node) => {
        if (node.id.startsWith('node_')) {
          const nodeNum = parseInt(node.id.split('_')[1]);
          return Math.max(max, nodeNum);
        }
        return max;
      }, 1);
      setNodeIdCounter(maxNodeId + 1);
      console.log('Set nodeIdCounter to:', maxNodeId + 1);
    } else if (triggerEvents.length > 0 && nodes.length === 0) {
      // Only create initial trigger node if we don't have existing nodes
      console.log('Creating initial trigger node');
      const triggerNode = {
        id: 'trigger_node',
        type: 'event_trigger',
        position: { x: 400, y: 50 },
        data: {
          triggerEvents: triggerEvents,
          nodeType: 'event_trigger',
          isLocked: true,
          onSettingsClick: () => setEventDetailsDrawerOpen(true),
          onEditClick: () => setShowEventSelector(!showEventSelector),
          onViewAllClick: () => setShowAllEventsModal(true),
        },
        draggable: true,
        deletable: false,
      };
      setNodes([triggerNode]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceData, triggerEvents, handleNodeSettingsClick]);

  const handleAddEvent = (eventId) => {
    const event = allEvents.find(e => e.id === eventId);
    if (event && !triggerEvents.find(e => e.id === eventId)) {
      setTriggerEvents([...triggerEvents, event]);
    }
    setShowEventSelector(false);
  };

  const handleRemoveEvent = (eventId) => {
    setTriggerEvents(triggerEvents.filter(e => e.id !== eventId));
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const color = event.dataTransfer.getData('application/reactflow/color');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Create node with custom type if it's condition, api_call, action, event, custom_rule, parallel, or merge
      const useCustomNode = type === 'condition' || type === 'api_call' || type === 'action' || type === 'event' || type === 'custom_rule' || type === 'parallel' || type === 'merge';

      console.log('Creating node with type:', type, 'useCustomNode:', useCustomNode, 'handler:', handleNodeSettingsClick);

      const newNode = {
        id: `node_${nodeIdCounter}`,
        type: useCustomNode ? type : 'default',
        position,
        data: {
          nodeType: type,
          onSettingsClick: handleNodeSettingsClick,
          // For custom nodes, initialize with empty config
          ...(type === 'condition' && { conditions: [] }),
          ...(type === 'api_call' && { apiConfig: {} }),
          ...(type === 'action' && { actionConfig: {} }),
          ...(type === 'event' && { eventConfig: {} }),
          ...(type === 'custom_rule' && { customRuleConfig: {} }),
          // For non-custom nodes, use the old label style
          ...(!useCustomNode && {
            label: (
              <Box>
                <Box
                  sx={{
                    backgroundColor: color,
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </Box>
                <Box
                  sx={{
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    px: 2,
                    py: 2,
                    borderRadius: '0 0 8px 8px',
                    fontSize: '0.875rem',
                  }}
                >
                  {label} Node
                </Box>
              </Box>
            ),
          }),
        },
        style: useCustomNode
          ? {}
          : {
              background: 'transparent',
              border: `2px solid ${color}`,
              borderRadius: 8,
              padding: 0,
              minWidth: 180,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeIdCounter((prev) => prev + 1);
    },
    [reactFlowInstance, nodeIdCounter, setNodes, handleNodeSettingsClick]
  );

  const onDragStart = (event, nodeType, label, color) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.setData('application/reactflow/color', color);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSave = async (action) => {
    try {
      // Sanitize nodes before saving - remove functions and React elements
      const sanitizedNodes = nodes.map(node => {
        const { data, ...nodeRest } = node;
        const { onSettingsClick, onEditClick, onViewAllClick, label, ...dataRest } = data || {};

        return {
          ...nodeRest,
          data: dataRest
        };
      });

      const sequenceUpdateData = {
        ...sequenceData,
        flow_nodes: sanitizedNodes,
        flow_edges: edges,
        trigger_events: triggerEvents.map(e => e.id),
        variables: variables,
        version: action === 'publish' ? String(parseFloat(version) + 0.1) : version,
        status: action === 'publish' ? 'active' : sequenceData.status || 'active',
      };

      if (action === 'publish') {
        setVersion(String(parseFloat(version) + 0.1));
      }

      // Save to backend
      if (sequenceData.id) {
        await sequencesApi.update(sequenceData.id, sequenceUpdateData);
      } else {
        await sequencesApi.create(sequenceUpdateData);
      }

      // Also call the parent onSave callback
      onSave(sequenceUpdateData);
    } catch (error) {
      console.error('Error saving sequence:', error);
      notification.error('Failed to save sequence', 'Please try again.');
    }
  };

  // Variable handlers
  const handleVariableSave = (updatedVariables) => {
    setVariables(updatedVariables);
  };

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#ffffff',
    }}>
      {/* Top Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px', color: '#111827' }}>
              {sequenceData.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Badge
                type={BadgeTypes.GRAY}
                size={BadgeSizes.SMALL}
                label={`v${version}`}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <LeegalityButton
              label="Save as Draft"
              type={ButtonTypes.SECONDARY}
              size={ButtonSizes.SMALL}
              onClick={() => handleSave('draft')}
              renderIcon={getRenderIcon(SaveIconFeather)}
            />
            <LeegalityButton
              label="Publish"
              type={ButtonTypes.PRIMARY}
              size={ButtonSizes.SMALL}
              onClick={() => handleSave('publish')}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <LeegalityButton
            label="Create Variable"
            type={ButtonTypes.SECONDARY}
            size={ButtonSizes.SMALL}
            onClick={() => {
              console.log('Create Variable clicked!', showVariableCreateModal);
              setShowVariableCreateModal(true);
            }}
            renderIcon={getRenderIcon(PlusIcon)}
          />
          <LeegalityButton
            label={`View Variables (${variables.length})`}
            type={ButtonTypes.PRIMARY}
            size={ButtonSizes.SMALL}
            onClick={() => {
              console.log('View Variables clicked!', showVariableListModal, variables);
              setShowVariableListModal(true);
            }}
            renderIcon={getRenderIcon(EyeIcon)}
          />
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <CloseIconFeather size={20} />
          </button>
        </div>
      </div>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <Box
          sx={{
            width: 288,
            flexShrink: 0,
            borderRight: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            overflowY: 'auto',
            p: 3,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#111827',
              mb: 3,
            }}
          >
            Node Types
          </Typography>

          {nodeTypes.map((node) => (
            <Paper
              key={node.type}
              draggable
              onDragStart={(event) => onDragStart(event, node.type, node.label, node.color)}
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                minHeight: 80,
                cursor: 'grab',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${node.color}`,
                borderRadius: 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'stretch',
                '&:hover': {
                  borderColor: '#d1d5db',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                },
                '&:active': {
                  cursor: 'grabbing',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, width: '100%' }}>
                <Box
                  sx={{
                    color: node.color,
                    display: 'flex',
                    alignItems: 'center',
                    mt: 0.5,
                  }}
                >
                  {node.icon}
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#111827',
                      mb: 0.5,
                    }}
                  >
                    {node.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      lineHeight: 1.4,
                    }}
                  >
                    {node.description}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Main Canvas */}
        <Box
          ref={reactFlowWrapper}
          sx={{
            flexGrow: 1,
            height: '100%',
            backgroundColor: '#ffffff',
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={customNodeTypes}
            fitView
            defaultEdgeOptions={{
              animated: false,
              style: { stroke: '#93c5fd', strokeWidth: 2 },
            }}
          >
            <Background
              color="#9ca3af"
              gap={16}
              size={1}
              variant="dots"
            />
            <Controls
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              }}
            />
            <MiniMap
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              }}
              nodeStrokeWidth={3}
              maskColor="rgba(0, 0, 0, 0.03)"
            />
          </ReactFlow>
        </Box>
      </Box>

      {/* Event Payload Viewer Dialog */}
      <Dialog
        open={showEventPayload}
        onClose={() => setShowEventPayload(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Event Payload
          <IconButton
            onClick={() => setShowEventPayload(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#6b7280',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Paper
            elevation={0}
            sx={{
              backgroundColor: '#f9fafb',
              p: 2,
              borderRadius: 1,
              border: '1px solid #e5e7eb',
            }}
          >
            <pre style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {JSON.stringify({
                cpId: '{{CP ID}}',
                consentProfileId: '{{Consent profile ID}}',
                purposes: ['purpose_001', 'purpose_002', 'purpose_003'],
                customParameter: '{{Custom parameter}}',
                timestamp: '2024-01-01T00:00:00Z',
                eventVersion: sequenceData.trigger_event_version || 'latest',
              }, null, 2)}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setShowEventPayload(false)} sx={{ textTransform: 'none' }}>
            Close
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* All Events Modal */}
      <Dialog
        open={showAllEventsModal}
        onClose={() => setShowAllEventsModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          All Trigger Events
          <IconButton
            onClick={() => setShowAllEventsModal(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#6b7280',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These events will trigger this sequence. Click the delete icon to remove an event.
          </Typography>
          <List>
            {triggerEvents.map((event, index) => (
              <ListItem
                key={event.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveEvent(event.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff',
                }}
              >
                <ListItemText
                  primary={event.name}
                  secondary={`Event ID: ${event.event_id} | Type: ${event.event_type === 'system' ? 'System' : 'Custom'}`}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setShowAllEventsModal(false)} sx={{ textTransform: 'none' }}>
            Close
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Event Selector Dialog */}
      <Dialog
        open={showEventSelector}
        onClose={() => setShowEventSelector(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Trigger Events
          <IconButton
            onClick={() => setShowEventSelector(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#6b7280',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select events to add as triggers for this sequence.
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value=""
            onChange={(e) => handleAddEvent(e.target.value)}
            sx={{ mb: 2 }}
          >
            <MenuItem value="" disabled>
              Choose an event to add...
            </MenuItem>
            {allEvents
              .filter(event => !triggerEvents.find(te => te.id === event.id))
              .map((event) => (
                <MenuItem key={event.id} value={event.id}>
                  {event.name} ({event.event_type === 'system' ? 'System' : 'Custom'})
                </MenuItem>
              ))}
          </Select>

          {triggerEvents.length > 0 && (
            <>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                Currently Selected Events:
              </Typography>
              <List>
                {triggerEvents.map((event) => (
                  <ListItem
                    key={event.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveEvent(event.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                    sx={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <ListItemText
                      primary={event.name}
                      secondary={event.event_type === 'system' ? 'System' : 'Custom'}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                      secondaryTypographyProps={{
                        fontSize: '0.75rem',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setShowEventSelector(false)} sx={{ textTransform: 'none' }}>
            Done
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Condition Configuration Drawer */}
      <ConditionConfigDrawer
        open={conditionDrawerOpen}
        onClose={() => {
          setConditionDrawerOpen(false);
          setSelectedNodeForConfig(null);
        }}
        nodeData={selectedNodeForConfig?.data}
        onSave={handleConditionSave}
        triggerEvents={triggerEvents}
        sequenceVariables={variables}
      />

      {/* API Configuration Drawer */}
      <APIConfigDrawer
        open={apiDrawerOpen}
        onClose={() => {
          setApiDrawerOpen(false);
          setSelectedNodeForConfig(null);
        }}
        nodeData={selectedNodeForConfig?.data}
        onSave={handleApiSave}
      />

      {/* Action Configuration Drawer */}
      <ActionConfigDrawer
        open={actionDrawerOpen}
        onClose={() => {
          setActionDrawerOpen(false);
          setSelectedNodeForConfig(null);
        }}
        nodeData={selectedNodeForConfig?.data}
        onSave={handleActionSave}
        triggerEvents={triggerEvents}
        sequenceVariables={variables}
      />

      {/* Event Configuration Drawer */}
      <EventConfigDrawer
        open={eventDrawerOpen}
        onClose={() => {
          setEventDrawerOpen(false);
          setSelectedNodeForConfig(null);
        }}
        nodeData={selectedNodeForConfig?.data}
        onSave={handleEventSave}
        triggerEvents={triggerEvents}
        sequenceVariables={variables}
      />

      {/* DSL Configuration Drawer */}
      <DSLConfigDrawer
        open={dslDrawerOpen}
        onClose={() => {
          setDslDrawerOpen(false);
          setSelectedNodeForConfig(null);
        }}
        nodeData={selectedNodeForConfig?.data}
        onSave={handleDslSave}
      />

      {/* Event Details Drawer */}
      <EventDetailsDrawer
        open={eventDetailsDrawerOpen}
        onClose={() => setEventDetailsDrawerOpen(false)}
        events={triggerEvents}
      />

      {/* Variable Create Modal */}
      {showVariableCreateModal && (
        <VariableCreateModal
          open={showVariableCreateModal}
          onClose={() => setShowVariableCreateModal(false)}
          onSave={(variableData) => {
            setVariables([...variables, variableData]);
            setShowVariableCreateModal(false);
          }}
        />
      )}

      {/* Variable List Modal */}
      {showVariableListModal && (
        <VariableListModal
          open={showVariableListModal}
          onClose={() => setShowVariableListModal(false)}
          variables={variables}
          onSave={handleVariableSave}
        />
      )}
    </Box>
  );
};

const SequenceBuilderWrapper = (props) => (
  <ReactFlowProvider>
    <SequenceBuilder {...props} />
  </ReactFlowProvider>
);

export default SequenceBuilderWrapper;
