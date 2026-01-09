import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Divider,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { connectorsApi, actionsApi } from '../services/api';
import notification from '@leegality/leegality-react-component-library/dist/notification';

const ActionConfigDrawer = ({ open, onClose, nodeData, onSave, triggerEvents = [], sequenceVariables = [] }) => {
  const [connectors, setConnectors] = useState([]);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [credentialSets, setCredentialSets] = useState([]);
  const [selectedCredentialSet, setSelectedCredentialSet] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  const [parameterMappings, setParameterMappings] = useState({
    path: {},
    query: {},
    headers: {},
    body: {},
  });

  // Track mapping mode for each parameter type: 'parameters' or 'dsl'
  const [mappingMode, setMappingMode] = useState({
    path: 'parameters',
    query: 'parameters',
    headers: 'parameters',
    body: 'parameters',
  });

  // Store DSL expressions for each parameter type
  const [dslExpressions, setDslExpressions] = useState({
    path: '',
    query: '',
    headers: '',
    body: '',
  });

  const [eventVariables, setEventVariables] = useState([]);
  const [allVariables, setAllVariables] = useState([]);
  const [dslModalOpen, setDslModalOpen] = useState(false);
  const [currentDslParam, setCurrentDslParam] = useState(null);

  // Load connectors on mount
  useEffect(() => {
    console.log('ActionConfigDrawer mounted, open:', open);
    if (open) {
      loadConnectors();
    }
  }, [open]);

  // Load existing configuration from nodeData
  useEffect(() => {
    if (nodeData && nodeData.actionConfig) {
      const config = nodeData.actionConfig;

      if (config.connectorId) {
        setSelectedConnector(config.connectorId);
        loadActions(config.connectorId);
      }

      if (config.actionId) {
        setSelectedAction(config.actionId);
        loadCredentialSets(config.actionId);
      }

      if (config.credentialSetId !== undefined) {
        setSelectedCredentialSet(config.credentialSetId);
      }

      if (config.parameterMappings) {
        setParameterMappings(config.parameterMappings);
      }

      if (config.mappingMode) {
        setMappingMode(config.mappingMode);
      }

      if (config.dslExpressions) {
        setDslExpressions(config.dslExpressions);
      }
    }
  }, [nodeData]);

  // Parse parameters from trigger events to extract variables
  useEffect(() => {
    console.log('Parsing trigger events for variables:', triggerEvents);
    if (triggerEvents && triggerEvents.length > 0) {
      const variables = [];

      triggerEvents.forEach(event => {
        console.log('Processing event:', event.name, 'parameters:', event.parameters);
        const parameters = event.parameters;

        if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
          console.log('Parameters found:', parameters);

          Object.entries(parameters).forEach(([key, paramDef]) => {
            if (!variables.find(v => v.path === `@event.${key}`)) {
              variables.push({
                path: `@event.${key}`,
                label: key,
                type: paramDef.type || 'string',
                description: paramDef.description || '',
                eventName: event.name,
                required: paramDef.required || false,
              });
            }
          });
        }
      });

      console.log('Extracted event variables:', variables);
      setEventVariables(variables);
    } else {
      console.log('No trigger events available');
      setEventVariables([]);
    }
  }, [triggerEvents]);

  // Merge event variables and sequence variables
  useEffect(() => {
    const merged = [];

    // Add event variables with indicator
    eventVariables.forEach(variable => {
      merged.push({
        ...variable,
        source: 'event',
        displayLabel: `${variable.label} (Event)`,
      });
    });

    // Add sequence variables with indicator
    sequenceVariables.forEach(variable => {
      merged.push({
        path: `@workflow.${variable.name}`,
        label: variable.name,
        type: variable.type,
        source: 'workflow',
        displayLabel: `${variable.name} (Workflow)`,
      });
    });

    setAllVariables(merged);
  }, [eventVariables, sequenceVariables]);

  const loadConnectors = async () => {
    try {
      console.log('Loading connectors...');
      const response = await connectorsApi.getAll();
      console.log('Connectors loaded:', response.data);
      setConnectors(response.data);
    } catch (error) {
      console.error('Error loading connectors:', error);
      notification.error('Failed to load connectors', 'Check console for details.');
    }
  };

  const loadActions = async (connectorId) => {
    try {
      const response = await actionsApi.list({ connector: connectorId });
      setActions(response.data);
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  };

  const loadCredentialSets = async (actionId) => {
    try {
      const response = await actionsApi.getCredentialSets(actionId);
      setCredentialSets(response.data.credential_sets || []);

      // If no credential set is selected yet, default to the default credential set
      if (selectedCredentialSet === null && response.data.credential_sets) {
        const defaultSet = response.data.credential_sets.find(cs => cs.is_default);
        if (defaultSet) {
          setSelectedCredentialSet(defaultSet.id);
        }
      }
    } catch (error) {
      console.error('Error loading credential sets:', error);
      setCredentialSets([]);
    }
  };

  const handleConnectorChange = (e) => {
    const connectorId = parseInt(e.target.value); // Parse to number to match connector IDs
    setSelectedConnector(connectorId);
    setSelectedAction(null);
    setActions([]);
    setParameterMappings({ path: {}, query: {}, headers: {}, body: {} });

    if (connectorId) {
      loadActions(connectorId);
    }
  };

  const handleActionChange = (e) => {
    const actionId = parseInt(e.target.value); // Parse to number to match action IDs
    setSelectedAction(actionId);

    // Load credential sets for this action
    if (actionId) {
      loadCredentialSets(actionId);
    }

    // Initialize parameter mappings based on action configuration
    const action = actions.find(a => a.id === actionId);
    console.log('Selected action:', action);
    console.log('Action config fields:', {
      path_params_config: action?.path_params_config,
      query_params_config: action?.query_params_config,
      headers_config: action?.headers_config,
      request_body_params: action?.request_body_params,
    });

    if (action) {
      const newMappings = { path: {}, query: {}, headers: {}, body: {} };

      // Initialize path params
      if (action.path_params_config) {
        Object.keys(action.path_params_config).forEach(param => {
          newMappings.path[param] = {
            type: 'static',
            value: action.path_params?.[param] || '',
          };
        });
      }

      // Initialize query params
      if (action.query_params_config) {
        Object.keys(action.query_params_config).forEach(param => {
          newMappings.query[param] = {
            type: 'static',
            value: action.query_params?.[param] || '',
          };
        });
      }

      // Initialize headers
      if (action.headers_config) {
        Object.keys(action.headers_config).forEach(param => {
          newMappings.headers[param] = {
            type: 'static',
            value: action.headers?.[param] || '',
          };
        });
      }

      // Initialize body params
      if (action.request_body_params) {
        newMappings.body = initializeBodyMappings(action.request_body_params, action.request_body || {});
      }

      setParameterMappings(newMappings);
    }
  };

  const initializeBodyMappings = (paramDefinitions, defaultValues) => {
    const mappings = {};

    Object.entries(paramDefinitions).forEach(([key, def]) => {
      if (def.type === 'object' && def.properties) {
        // Nested object
        mappings[key] = initializeBodyMappings(def.properties, defaultValues[key] || {});
      } else {
        // Simple parameter
        mappings[key] = {
          type: 'static',
          value: defaultValues[key] || def.default || '',
        };
      }
    });

    return mappings;
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const updateParameterMapping = (paramType, paramName, field, value, nestedPath = []) => {
    setParameterMappings(prev => {
      const updated = { ...prev };

      if (nestedPath.length === 0) {
        // Top-level parameter
        if (!updated[paramType][paramName]) {
          updated[paramType][paramName] = {};
        }
        updated[paramType][paramName][field] = value;
      } else {
        // Nested parameter - navigate through path
        let target = updated[paramType];
        for (let i = 0; i < nestedPath.length; i++) {
          const pathKey = nestedPath[i];
          if (!target[pathKey]) {
            target[pathKey] = {};
          }
          if (i === nestedPath.length - 1) {
            // Last level - update the value
            if (!target[pathKey][paramName]) {
              target[pathKey][paramName] = {};
            }
            target[pathKey][paramName][field] = value;
          } else {
            target = target[pathKey];
          }
        }
      }

      return updated;
    });
  };

  const handleSave = () => {
    const action = actions.find(a => a.id === selectedAction);
    const connector = connectors.find(c => c.id === selectedConnector);

    // Count mapped parameters for display
    let mappedCount = 0;
    Object.values(parameterMappings).forEach(typeMapping => {
      mappedCount += countMappedParams(typeMapping);
    });

    // Ensure we preserve all node data including nodeType
    const updatedData = {
      ...nodeData,
      nodeType: nodeData?.nodeType || 'action', // Ensure nodeType is always set
      actionConfig: {
        connectorId: selectedConnector,
        connectorName: connector?.name,
        actionId: selectedAction,
        actionName: action?.name,
        httpMethod: action?.http_method,
        credentialSetId: selectedCredentialSet,
        parameterMappings: parameterMappings,
        mappingMode: mappingMode,
        dslExpressions: dslExpressions,
        mappedParams: mappedCount,
      },
    };

    console.log('ActionConfigDrawer saving data:', updatedData);
    onSave(updatedData);
    onClose();
  };

  const countMappedParams = (obj) => {
    let count = 0;
    Object.values(obj).forEach(val => {
      if (val && typeof val === 'object') {
        if (val.type && val.value) {
          count++;
        } else {
          count += countMappedParams(val);
        }
      }
    });
    return count;
  };

  const renderParameterField = (paramName, paramConfig, paramMapping, paramType, nestedPath = []) => {
    const isMandatory = paramConfig?.mandatory || false;
    const description = paramConfig?.description || '';

    return (
      <Box key={paramName} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {paramName}
          </Typography>
          {isMandatory && (
            <Chip label="Required" size="small" color="error" sx={{ ml: 1, height: '18px', fontSize: '0.65rem' }} />
          )}
          {description && (
            <Tooltip title={description} arrow>
              <InfoIcon sx={{ ml: 1, fontSize: '0.9rem', color: '#9ca3af' }} />
            </Tooltip>
          )}
        </Box>

        <ToggleButtonGroup
          value={paramMapping?.type || 'static'}
          exclusive
          onChange={(e, val) => val && updateParameterMapping(paramType, paramName, 'type', val, nestedPath)}
          size="small"
          fullWidth
          sx={{ mb: 1 }}
        >
          <ToggleButton value="static">Static</ToggleButton>
          <ToggleButton value="variable">Variable</ToggleButton>
        </ToggleButtonGroup>

        {paramMapping?.type === 'static' && (
          <TextField
            fullWidth
            size="small"
            value={paramMapping?.value || ''}
            onChange={(e) => updateParameterMapping(paramType, paramName, 'value', e.target.value, nestedPath)}
            placeholder="Enter static value"
          />
        )}

        {paramMapping?.type === 'variable' && (
          <select
            value={paramMapping?.value || ''}
            onChange={(e) => updateParameterMapping(paramType, paramName, 'value', e.target.value, nestedPath)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
          >
            <option value="">Select a variable</option>
            {allVariables.map((variable) => (
              <option key={variable.path} value={variable.path}>
                {variable.displayLabel} - {variable.type}
              </option>
            ))}
          </select>
        )}
      </Box>
    );
  };

  const renderBodyParameters = (params, mappings, nestedPath = []) => {
    if (!params) return null;

    return Object.entries(params).map(([paramName, paramDef]) => {
      if (paramDef.type === 'object' && paramDef.properties) {
        // Nested object - render as accordion
        return (
          <Accordion key={paramName} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {paramName}
                </Typography>
                <Chip label="Object" size="small" sx={{ ml: 1, height: '18px', fontSize: '0.65rem' }} />
                {paramDef.mandatory && (
                  <Chip label="Required" size="small" color="error" sx={{ ml: 1, height: '18px', fontSize: '0.65rem' }} />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ pl: 2 }}>
                {renderBodyParameters(
                  paramDef.properties,
                  mappings?.[paramName] || {},
                  [...nestedPath, paramName]
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      } else {
        // Simple parameter
        const mapping = mappings?.[paramName] || {};
        return renderParameterField(
          paramName,
          paramDef,
          mapping,
          'body',
          nestedPath
        );
      }
    });
  };

  const action = actions.find(a => a.id === selectedAction);
  const connector = connectors.find(c => c.id === selectedConnector);

  // Dynamically build available tabs
  const availableTabs = [];
  if (action) {
    if (action.path_params_config && Object.keys(action.path_params_config).length > 0) {
      availableTabs.push({ type: 'path', label: `Path (${Object.keys(action.path_params_config).length})` });
    }
    if (action.query_params_config && Object.keys(action.query_params_config).length > 0) {
      availableTabs.push({ type: 'query', label: `Query (${Object.keys(action.query_params_config).length})` });
    }
    if (action.headers_config && Object.keys(action.headers_config).length > 0) {
      availableTabs.push({ type: 'headers', label: `Headers (${Object.keys(action.headers_config).length})` });
    }
    if (action.request_body_params && Object.keys(action.request_body_params).length > 0) {
      availableTabs.push({ type: 'body', label: `Body (${Object.keys(action.request_body_params).length})` });
    }
  }

  console.log('Available tabs for action:', availableTabs);
  console.log('Selected action ID:', selectedAction, 'Action found:', !!action);

  const currentTabType = availableTabs[currentTab]?.type;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 550 },
      }}
      sx={{
        zIndex: 10000,
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Configure Action
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Action Selection */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                Connector
              </Typography>
              <select
                value={selectedConnector || ''}
                onChange={handleConnectorChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a connector</option>
                {connectors.map((connector) => (
                  <option key={connector.id} value={connector.id}>
                    {connector.name}
                  </option>
                ))}
              </select>
            </Box>

            {selectedConnector && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                  Action
                </Typography>
                <select
                  value={selectedAction || ''}
                  onChange={handleActionChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select an action</option>
                  {actions.map((action) => (
                    <option key={action.id} value={action.id}>
                      {action.name} - {action.http_method} {action.endpoint_path}
                    </option>
                  ))}
                </select>
              </Box>
            )}

            {selectedAction && credentialSets.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                  Credential Set
                </Typography>
                <select
                  value={selectedCredentialSet || ''}
                  onChange={(e) => setSelectedCredentialSet(e.target.value ? parseInt(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Use default credential set</option>
                  {credentialSets.map((credentialSet) => (
                    <option key={credentialSet.id} value={credentialSet.id}>
                      {credentialSet.name} {credentialSet.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <Typography variant="caption" sx={{ color: '#6b7280', mt: 0.5, display: 'block' }}>
                  Select which credential set to use for this action. Defaults to the default credential set if not specified.
                </Typography>
              </Box>
            )}

            {action && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>{action.name}</strong>
                  <br />
                  {action.description}
                </Typography>
              </Alert>
            )}
          </Box>

          {selectedAction && action && (
            <>
              <Divider />

              {/* Parameter Mapping Tabs */}
              <Box>
                <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  {availableTabs.map((tab, index) => (
                    <Tab key={tab.type} label={tab.label} />
                  ))}
                </Tabs>

                <Box sx={{ p: 2 }}>
                  {eventVariables.length === 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      No event variables available. Select trigger events in the sequence to enable variable mapping.
                    </Alert>
                  )}

                  {/* Path Parameters Tab */}
                  {currentTabType === 'path' && action.path_params_config && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Path Parameters
                        </Typography>
                        <ToggleButtonGroup
                          value={mappingMode.path}
                          exclusive
                          onChange={(e, val) => val && setMappingMode({ ...mappingMode, path: val })}
                          size="small"
                        >
                          <ToggleButton value="parameters">Parameter Mapping</ToggleButton>
                          <ToggleButton value="dsl">DSL Mode</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>

                      {mappingMode.path === 'parameters' ? (
                        Object.entries(action.path_params_config).map(([paramName, paramConfig]) =>
                          renderParameterField(
                            paramName,
                            paramConfig,
                            parameterMappings.path[paramName],
                            'path'
                          )
                        )
                      ) : (
                        <Box>
                          <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                            Construct path parameters object using DSL. Values will be interpolated into the URL path.
                          </Alert>
                          <TextField
                            fullWidth
                            multiline
                            minRows={6}
                            maxRows={15}
                            value={dslExpressions.path}
                            onChange={(e) => setDslExpressions({ ...dslExpressions, path: e.target.value })}
                            placeholder={`Example - Path Parameters DSL:
{
  "documentId": @event.documentId,
  "userId": @event.userId
}`}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              '& textarea': { resize: 'vertical' },
                              '& textarea::placeholder': {
                                fontSize: '0.7rem',
                                lineHeight: '1.5',
                                color: '#6b7280',
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Query Parameters Tab */}
                  {currentTabType === 'query' && action.query_params_config && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Query Parameters
                        </Typography>
                        <ToggleButtonGroup
                          value={mappingMode.query}
                          exclusive
                          onChange={(e, val) => val && setMappingMode({ ...mappingMode, query: val })}
                          size="small"
                        >
                          <ToggleButton value="parameters">Parameter Mapping</ToggleButton>
                          <ToggleButton value="dsl">DSL Mode</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>

                      {mappingMode.query === 'parameters' ? (
                        Object.entries(action.query_params_config).map(([paramName, paramConfig]) =>
                          renderParameterField(
                            paramName,
                            paramConfig,
                            parameterMappings.query[paramName],
                            'query'
                          )
                        )
                      ) : (
                        <Box>
                          <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                            Construct the entire query parameters object using DSL. Result should be a flat object with key-value pairs.
                          </Alert>
                          <TextField
                            fullWidth
                            multiline
                            minRows={8}
                            maxRows={20}
                            value={dslExpressions.query}
                            onChange={(e) => setDslExpressions({ ...dslExpressions, query: e.target.value })}
                            placeholder={`Example - Query Parameters DSL:
{
  "documentId": @event.documentId,
  "userId": @event.userId,
  "format": "pdf",
  "includeMetadata": @event.includeDetails ? "true" : "false",
  "timestamp": @now()
}`}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              '& textarea': { resize: 'vertical' },
                              '& textarea::placeholder': {
                                fontSize: '0.7rem',
                                lineHeight: '1.5',
                                color: '#6b7280',
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Headers Tab */}
                  {currentTabType === 'headers' && action.headers_config && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Headers
                        </Typography>
                        <ToggleButtonGroup
                          value={mappingMode.headers}
                          exclusive
                          onChange={(e, val) => val && setMappingMode({ ...mappingMode, headers: val })}
                          size="small"
                        >
                          <ToggleButton value="parameters">Parameter Mapping</ToggleButton>
                          <ToggleButton value="dsl">DSL Mode</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>

                      {mappingMode.headers === 'parameters' ? (
                        Object.entries(action.headers_config).map(([paramName, paramConfig]) =>
                          renderParameterField(
                            paramName,
                            paramConfig,
                            parameterMappings.headers[paramName],
                            'headers'
                          )
                        )
                      ) : (
                        <Box>
                          <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                            Construct headers object using DSL. These will be added to the HTTP request headers.
                          </Alert>
                          <TextField
                            fullWidth
                            multiline
                            minRows={8}
                            maxRows={15}
                            value={dslExpressions.headers}
                            onChange={(e) => setDslExpressions({ ...dslExpressions, headers: e.target.value })}
                            placeholder={`Example - Headers DSL:
{
  "Authorization": "Bearer " | concat(@event.accessToken),
  "Content-Type": "application/json",
  "X-User-Id": @event.userId,
  "X-Request-Id": @event.requestId,
  "X-Timestamp": @now()
}`}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              '& textarea': { resize: 'vertical' },
                              '& textarea::placeholder': {
                                fontSize: '0.7rem',
                                lineHeight: '1.5',
                                color: '#6b7280',
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Body Parameters Tab */}
                  {currentTabType === 'body' && action.request_body_params && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Request Body
                        </Typography>
                        <ToggleButtonGroup
                          value={mappingMode.body}
                          exclusive
                          onChange={(e, val) => val && setMappingMode({ ...mappingMode, body: val })}
                          size="small"
                        >
                          <ToggleButton value="parameters">Parameter Mapping</ToggleButton>
                          <ToggleButton value="dsl">DSL Mode</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>

                      {mappingMode.body === 'parameters' ? (
                        renderBodyParameters(action.request_body_params, parameterMappings.body)
                      ) : (
                        <Box>
                          <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                            Construct the entire request body JSON using DSL. Supports nested objects, arrays, conditionals, and transformations.
                          </Alert>
                          <TextField
                            fullWidth
                            multiline
                            minRows={12}
                            maxRows={25}
                            value={dslExpressions.body}
                            onChange={(e) => setDslExpressions({ ...dslExpressions, body: e.target.value })}
                            placeholder={`Example - Complete Request Body DSL:
{
  "order": {
    "orderId": @event.requestId,
    "customer": {
      "name": @event.firstName | concat(" ", @event.lastName),
      "email": @event.email | lowercase,
      "tier": @event.isPremium ? "gold" : "silver"
    },
    "items": @event.orderItems | map(item => {
      "productId": item.id,
      "quantity": item.qty,
      "price": item.unitPrice,
      "subtotal": item.qty * item.unitPrice
    }),
    "shipping": {
      "address": @event.shippingAddress,
      "method": "standard",
      "tracking": @event.trackingNumber ?? "pending"
    },
    "totals": {
      "itemCount": @event.orderItems | length,
      "subtotal": @event.orderItems | sum(i => i.qty * i.unitPrice),
      "tax": @event.taxAmount,
      "total": @event.finalTotal
    },
    "metadata": {
      "source": "web_app",
      "processedAt": @now(),
      "notes": @event.customerNotes | substring(0, 200)
    }
  }
}`}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              '& textarea': { resize: 'vertical' },
                              '& textarea::placeholder': {
                                fontSize: '0.7rem',
                                lineHeight: '1.5',
                                color: '#6b7280',
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: 2,
          }}
        >
          <Button variant="outlined" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            fullWidth
            disabled={!selectedAction}
          >
            Save Configuration
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ActionConfigDrawer;
