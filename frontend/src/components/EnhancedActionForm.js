import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Box,
  IconButton,
  Grid,
  Checkbox,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

const EnhancedActionForm = ({ open, onClose, onSave, action = null, connectorId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    connector: connectorId,
    name: '',
    description: '',
    http_method: 'GET',
    endpoint_path: '',
    request_body: '{}',
    request_body_template: '{}',
    enable_custom_success_logic: false,
    success_criteria: '',
    success_criteria_description: '',
    // Async action fields
    action_type: 'sync',
    async_type: 'polling',
    polling_endpoint_path: '',
    polling_http_method: 'GET',
    polling_frequency_seconds: 30,
    max_polling_attempts: 10,
    async_success_criteria: '',
    async_failure_criteria: '',
    async_success_description: '',
    async_failure_description: '',
    // New webhook fields
    webhook_type: 'dynamic',
    webhook_url_injection_method: '',
    webhook_url_injection_param: '',
    webhook_timeout_seconds: 3600,
    webhook_identifier_mapping: {},
    webhook_success_criteria: '',
    webhook_failure_criteria: '',
  });
  
  // Enhanced parameter states with metadata
  const [pathParams, setPathParams] = useState([{ key: '', value: '', mandatory: false, description: '' }]);
  const [queryParams, setQueryParams] = useState([{ key: '', value: '', mandatory: false, description: '' }]);
  const [headers, setHeaders] = useState([{ key: '', value: '', mandatory: false, description: '' }]);
  const [bodyParams, setBodyParams] = useState([{ key: '', type: 'string', mandatory: false, default: '', description: '' }]);
  
  // Async action parameter states
  const [pollingPathParams, setPollingPathParams] = useState([{ key: '', value: '', mandatory: false, description: '' }]);
  const [pollingQueryParams, setPollingQueryParams] = useState([{ key: '', value: '', mandatory: false, description: '' }]);
  const [pollingHeaders, setPollingHeaders] = useState([{ key: '', value: '', mandatory: false, description: '' }]);
  const [pollingBodyParams, setPollingBodyParams] = useState([{ key: '', type: 'string', mandatory: false, default: '', description: '' }]);
  const [responseMapping, setResponseMapping] = useState([{ responsePath: '', targetType: 'path', targetParam: '', jsonPath: '' }]);
  const [identifierMapping, setIdentifierMapping] = useState([{ initialField: '', webhookField: '' }]);
  
  const [error, setError] = useState('');

  // Helper functions for enhanced parameters
  const addPathParam = () => {
    setPathParams([...pathParams, { key: '', value: '', mandatory: false, description: '' }]);
  };

  const removePathParam = (index) => {
    if (pathParams.length > 1) {
      setPathParams(pathParams.filter((_, i) => i !== index));
    }
  };

  const updatePathParam = (index, field, value) => {
    const updated = [...pathParams];
    updated[index][field] = value;
    setPathParams(updated);
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', mandatory: false, description: '' }]);
  };

  const removeQueryParam = (index) => {
    if (queryParams.length > 1) {
      setQueryParams(queryParams.filter((_, i) => i !== index));
    }
  };

  const updateQueryParam = (index, field, value) => {
    const updated = [...queryParams];
    updated[index][field] = value;
    setQueryParams(updated);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', mandatory: false, description: '' }]);
  };

  const removeHeader = (index) => {
    if (headers.length > 1) {
      setHeaders(headers.filter((_, i) => i !== index));
    }
  };

  const updateHeader = (index, field, value) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
  };

  const addBodyParam = () => {
    setBodyParams([...bodyParams, { key: '', type: 'string', mandatory: false, default: '', description: '' }]);
  };

  const removeBodyParam = (index) => {
    if (bodyParams.length > 1) {
      setBodyParams(bodyParams.filter((_, i) => i !== index));
    }
  };

  const updateBodyParam = (index, field, value) => {
    const updated = [...bodyParams];
    updated[index][field] = value;
    setBodyParams(updated);
  };

  // Async polling parameter helper functions
  const addPollingPathParam = () => {
    setPollingPathParams([...pollingPathParams, { key: '', value: '', mandatory: false, description: '' }]);
  };

  const removePollingPathParam = (index) => {
    if (pollingPathParams.length > 1) {
      setPollingPathParams(pollingPathParams.filter((_, i) => i !== index));
    }
  };

  const updatePollingPathParam = (index, field, value) => {
    const updated = [...pollingPathParams];
    updated[index][field] = value;
    setPollingPathParams(updated);
  };

  const addPollingQueryParam = () => {
    setPollingQueryParams([...pollingQueryParams, { key: '', value: '', mandatory: false, description: '' }]);
  };

  const removePollingQueryParam = (index) => {
    if (pollingQueryParams.length > 1) {
      setPollingQueryParams(pollingQueryParams.filter((_, i) => i !== index));
    }
  };

  const updatePollingQueryParam = (index, field, value) => {
    const updated = [...pollingQueryParams];
    updated[index][field] = value;
    setPollingQueryParams(updated);
  };

  const addPollingHeader = () => {
    setPollingHeaders([...pollingHeaders, { key: '', value: '', mandatory: false, description: '' }]);
  };

  const removePollingHeader = (index) => {
    if (pollingHeaders.length > 1) {
      setPollingHeaders(pollingHeaders.filter((_, i) => i !== index));
    }
  };

  const updatePollingHeader = (index, field, value) => {
    const updated = [...pollingHeaders];
    updated[index][field] = value;
    setPollingHeaders(updated);
  };

  const addPollingBodyParam = () => {
    setPollingBodyParams([...pollingBodyParams, { key: '', type: 'string', mandatory: false, default: '', description: '' }]);
  };

  const removePollingBodyParam = (index) => {
    if (pollingBodyParams.length > 1) {
      setPollingBodyParams(pollingBodyParams.filter((_, i) => i !== index));
    }
  };

  const updatePollingBodyParam = (index, field, value) => {
    const updated = [...pollingBodyParams];
    updated[index][field] = value;
    setPollingBodyParams(updated);
  };

  // Response mapping helper functions
  const addResponseMapping = () => {
    setResponseMapping([...responseMapping, { responsePath: '', targetType: 'path', targetParam: '', jsonPath: '' }]);
  };

  const removeResponseMapping = (index) => {
    if (responseMapping.length > 1) {
      setResponseMapping(responseMapping.filter((_, i) => i !== index));
    }
  };

  const updateResponseMapping = (index, field, value) => {
    const updated = [...responseMapping];
    updated[index][field] = value;
    setResponseMapping(updated);
  };

  // Identifier mapping helper functions
  const addIdentifierMapping = () => {
    setIdentifierMapping([...identifierMapping, { initialField: '', webhookField: '' }]);
  };

  const removeIdentifierMapping = (index) => {
    if (identifierMapping.length > 1) {
      setIdentifierMapping(identifierMapping.filter((_, i) => i !== index));
    }
  };

  const updateIdentifierMapping = (index, field, value) => {
    const updated = [...identifierMapping];
    updated[index][field] = value;
    setIdentifierMapping(updated);
  };

  // Helper functions for webhook URL injection
  const getInjectionPlaceholder = () => {
    switch (formData.webhook_url_injection_method) {
      case 'query': return 'webhook_url';
      case 'body': return 'callback.url';
      case 'path': return 'callbackUrl';
      default: return 'parameter_name';
    }
  };

  const getInjectionHelperText = () => {
    switch (formData.webhook_url_injection_method) {
      case 'query': return 'Query parameter name (e.g., webhook_url)';
      case 'body': return 'Dot notation path in request body (e.g., callback.url)';
      case 'path': return 'Path parameter name for URL template (e.g., callbackUrl)';
      default: return 'Select injection method first';
    }
  };

  // Convert enhanced parameters to backend format
  const enhancedParamsToBackend = (params, type = 'simple') => {
    const values = {};
    const config = {};
    
    // Safely process parameters, handling undefined/null keys
    if (Array.isArray(params)) {
      params.forEach(param => {
        if (param && param.key && param.key.trim()) {
          const trimmedKey = param.key.trim();
          if (type === 'body') {
            // For body parameters, store in config with type info
            config[trimmedKey] = {
              mandatory: param.mandatory || false,
              type: param.type || 'string',
              description: param.description || '',
              ...(param.default && { default: param.default })
            };
          } else {
            // For query params and headers
            values[trimmedKey] = param.value || '';
            config[trimmedKey] = {
              mandatory: param.mandatory || false,
              description: param.description || ''
            };
          }
        }
      });
    }
    
    return { values, config };
  };

  // Convert backend format to enhanced parameters
  const backendToEnhancedParams = (values = {}, config = {}, type = 'simple') => {
    const result = [];
    
    // Get all unique keys from both values and config
    const allKeys = new Set([...Object.keys(values), ...Object.keys(config)]);
    
    if (allKeys.size === 0) {
      return type === 'body' 
        ? [{ key: '', type: 'string', mandatory: false, default: '', description: '' }]
        : [{ key: '', value: '', mandatory: false, description: '' }];
    }
    
    allKeys.forEach(key => {
      const paramConfig = config[key] || {};
      
      if (type === 'body') {
        result.push({
          key,
          type: paramConfig.type || 'string',
          mandatory: paramConfig.mandatory || false,
          default: paramConfig.default || '',
          description: paramConfig.description || ''
        });
      } else {
        result.push({
          key,
          value: values[key] || '',
          mandatory: paramConfig.mandatory || false,
          description: paramConfig.description || ''
        });
      }
    });
    
    return result;
  };

  useEffect(() => {
    if (action) {
      setFormData({
        connector: action.connector,
        name: action.name,
        description: action.description,
        http_method: action.http_method,
        endpoint_path: action.endpoint_path,
        request_body: JSON.stringify(action.request_body || {}, null, 2),
        request_body_template: JSON.stringify(action.request_body_template || {}, null, 2),
        enable_custom_success_logic: action.enable_custom_success_logic || false,
        success_criteria: action.success_criteria || '',
        success_criteria_description: action.success_criteria_description || '',
        // Load async action fields
        action_type: action.action_type || 'sync',
        async_type: action.async_type || 'polling',
        polling_endpoint_path: action.polling_endpoint_path || '',
        polling_http_method: action.polling_http_method || 'GET',
        polling_frequency_seconds: action.polling_frequency_seconds || 30,
        max_polling_attempts: action.max_polling_attempts || 10,
        async_success_criteria: action.async_success_criteria || '',
        async_failure_criteria: action.async_failure_criteria || '',
        async_success_description: action.async_success_description || '',
        async_failure_description: action.async_failure_description || '',
        // New webhook fields
        webhook_type: action.webhook_type || 'dynamic',
        webhook_url_injection_method: action.webhook_url_injection_method || '',
        webhook_url_injection_param: action.webhook_url_injection_param || '',
        webhook_timeout_seconds: action.webhook_timeout_seconds || 3600,
        webhook_identifier_mapping: action.webhook_identifier_mapping || {},
        webhook_success_criteria: action.webhook_success_criteria || '',
        webhook_failure_criteria: action.webhook_failure_criteria || '',
      });
      
      // Load enhanced parameters
      setPathParams(backendToEnhancedParams(action.path_params, action.path_params_config));
      setQueryParams(backendToEnhancedParams(action.query_params, action.query_params_config));
      setHeaders(backendToEnhancedParams(action.headers, action.headers_config));
      setBodyParams(backendToEnhancedParams({}, action.request_body_params, 'body'));
      
      // Load async polling parameters
      setPollingPathParams(backendToEnhancedParams(action.polling_path_params, action.polling_path_params_config));
      setPollingQueryParams(backendToEnhancedParams(action.polling_query_params, action.polling_query_params_config));
      setPollingHeaders(backendToEnhancedParams(action.polling_headers, action.polling_headers_config));
      setPollingBodyParams(backendToEnhancedParams({}, action.polling_request_body_params, 'body'));
      
      // Load response mapping
      if (action.response_to_polling_mapping) {
        const mappingArray = Object.entries(action.response_to_polling_mapping).map(([responsePath, config]) => ({
          responsePath,
          targetType: config.target_type || 'path',
          targetParam: config.target_param || '',
          jsonPath: config.json_path || responsePath
        }));
        setResponseMapping(mappingArray.length > 0 ? mappingArray : [{ responsePath: '', targetType: 'path', targetParam: '', jsonPath: '' }]);
      }
      
      // Load webhook identifier mapping
      if (action.webhook_identifier_mapping) {
        const identifierMappingArray = Object.entries(action.webhook_identifier_mapping).map(([initialField, webhookField]) => ({
          initialField,
          webhookField
        }));
        setIdentifierMapping(identifierMappingArray.length > 0 ? identifierMappingArray : [{ initialField: '', webhookField: '' }]);
      }
    } else {
      setFormData({
        connector: connectorId,
        name: '',
        description: '',
        http_method: 'GET',
        endpoint_path: '',
        request_body: '{}',
        request_body_template: '{}',
        enable_custom_success_logic: false,
        success_criteria: '',
        success_criteria_description: '',
        // Reset async action fields
        action_type: 'sync',
        async_type: 'polling',
        polling_endpoint_path: '',
        polling_http_method: 'GET',
        polling_frequency_seconds: 30,
        max_polling_attempts: 10,
        async_success_criteria: '',
        async_failure_criteria: '',
        async_success_description: '',
        async_failure_description: '',
        // New webhook fields
        webhook_type: 'dynamic',
        webhook_url_injection_method: '',
        webhook_url_injection_param: '',
        webhook_timeout_seconds: 3600,
        webhook_identifier_mapping: {},
        webhook_success_criteria: '',
        webhook_failure_criteria: '',
      });
      setPathParams([{ key: '', value: '', mandatory: false, description: '' }]);
      setQueryParams([{ key: '', value: '', mandatory: false, description: '' }]);
      setHeaders([{ key: '', value: '', mandatory: false, description: '' }]);
      setBodyParams([{ key: '', type: 'string', mandatory: false, default: '', description: '' }]);
      
      // Reset async parameter states
      setPollingPathParams([{ key: '', value: '', mandatory: false, description: '' }]);
      setPollingQueryParams([{ key: '', value: '', mandatory: false, description: '' }]);
      setPollingHeaders([{ key: '', value: '', mandatory: false, description: '' }]);
      setPollingBodyParams([{ key: '', type: 'string', mandatory: false, default: '', description: '' }]);
      setResponseMapping([{ responsePath: '', targetType: 'path', targetParam: '', jsonPath: '' }]);
      setIdentifierMapping([{ initialField: '', webhookField: '' }]);
    }
    setError('');
  }, [action, open, connectorId]);

  const handleChange = (e) => {
    console.log('Form field changed:', e.target.name, '=', e.target.value);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Debug webhook rendering conditions
    if (e.target.name === 'action_type' || e.target.name === 'async_type') {
      console.log('Action/Async type changed. Current formData after update will be:', {
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const validateJSON = (jsonString) => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate JSON fields
    if (!validateJSON(formData.request_body)) {
      setError('Invalid JSON in Request Body');
      return;
    }
    
    if (!validateJSON(formData.request_body_template)) {
      setError('Invalid JSON in Request Body Template');
      return;
    }

    try {
      // Convert enhanced parameters to backend format
      const pathData = enhancedParamsToBackend(pathParams);
      const queryData = enhancedParamsToBackend(queryParams);
      const headersData = enhancedParamsToBackend(headers);
      const bodyData = enhancedParamsToBackend(bodyParams, 'body');
      
      // Convert async polling parameters
      const pollingPathData = enhancedParamsToBackend(pollingPathParams);
      const pollingQueryData = enhancedParamsToBackend(pollingQueryParams);
      const pollingHeadersData = enhancedParamsToBackend(pollingHeaders);
      const pollingBodyData = enhancedParamsToBackend(pollingBodyParams, 'body');
      
      // Convert response mapping to backend format
      const responseMappingData = {};
      responseMapping.forEach((mapping) => {
        if (mapping.responsePath && mapping.targetType && mapping.targetParam) {
          responseMappingData[mapping.responsePath] = {
            target_type: mapping.targetType,
            target_param: mapping.targetParam,
            json_path: mapping.jsonPath || mapping.responsePath
          };
        }
      });
      
      // Convert webhook identifier mapping
      const webhookIdentifierMappingData = {};
      identifierMapping.forEach((mapping) => {
        if (mapping.initialField && mapping.webhookField) {
          webhookIdentifierMappingData[mapping.initialField] = mapping.webhookField;
        }
      });
      
      const submitData = {
        ...formData,
        path_params: pathData.values,
        path_params_config: pathData.config,
        query_params: queryData.values,
        query_params_config: queryData.config,
        headers: headersData.values,
        headers_config: headersData.config,
        request_body: JSON.parse(formData.request_body),
        request_body_template: JSON.parse(formData.request_body_template),
        request_body_params: bodyData.config,
        
        // Async action data
        polling_path_params: pollingPathData.values,
        polling_path_params_config: pollingPathData.config,
        polling_query_params: pollingQueryData.values,
        polling_query_params_config: pollingQueryData.config,
        polling_headers: pollingHeadersData.values,
        polling_headers_config: pollingHeadersData.config,
        polling_request_body: pollingBodyData.config,
        polling_request_body_params: pollingBodyData.config,
        response_to_polling_mapping: responseMappingData,
        webhook_identifier_mapping: webhookIdentifierMappingData,
      };
      
      await onSave(submitData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save action');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const renderParameterGrid = (params, updateFn, addFn, removeFn, type = 'simple') => {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addFn}
            variant="outlined"
          >
            Add {type === 'body' ? 'Parameter' : type === 'headers' ? 'Header' : 'Parameter'}
          </Button>
        </Box>
        
        {params.map((param, index) => (
          <Accordion key={index} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, minWidth: '120px' }}>
                {param.key || `${type === 'body' ? 'Parameter' : type === 'headers' ? 'Header' : 'Parameter'} ${index + 1}`}
              </Typography>
              <Typography sx={{ color: 'text.secondary', ml: 2 }}>
                {param.mandatory && <strong>[MANDATORY]</strong>} {param.description}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={`${type === 'body' ? 'Parameter' : type === 'headers' ? 'Header' : 'Parameter'} Name`}
                    value={param.key}
                    onChange={(e) => updateFn(index, 'key', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                
                {type === 'body' ? (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={param.type}
                          onChange={(e) => updateFn(index, 'type', e.target.value)}
                          label="Type"
                        >
                          <MenuItem value="string">String</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="boolean">Boolean</MenuItem>
                          <MenuItem value="object">Object</MenuItem>
                          <MenuItem value="array">Array</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Default Value"
                        value={param.default}
                        onChange={(e) => updateFn(index, 'default', e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="Optional default value"
                      />
                    </Grid>
                  </>
                ) : (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Default Value"
                      value={param.value}
                      onChange={(e) => updateFn(index, 'value', e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="Optional default value"
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={param.description}
                    onChange={(e) => updateFn(index, 'description', e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Parameter description"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={param.mandatory}
                          onChange={(e) => updateFn(index, 'mandatory', e.target.checked)}
                        />
                      }
                      label="Mandatory (will cause validation error if missing)"
                    />
                    <IconButton
                      onClick={() => removeFn(index)}
                      disabled={params.length === 1}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {action ? 'Edit Action' : 'New Action'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Basic Info */}
          <Box sx={{ mb: 3 }}>
            <TextField
              name="name"
              label="Name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            
            <TextField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>HTTP Method</InputLabel>
                  <Select
                    name="http_method"
                    value={formData.http_method}
                    onChange={handleChange}
                    label="HTTP Method"
                  >
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="PATCH">PATCH</MenuItem>
                    <MenuItem value="DELETE">DELETE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="endpoint_path"
                  label="Endpoint Path"
                  value={formData.endpoint_path}
                  onChange={handleChange}
                  fullWidth
                  helperText="Path to append to base URL (e.g., /api/users)"
                />
              </Grid>
              
              {/* Action Type Selection */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    name="action_type"
                    value={formData.action_type}
                    label="Action Type"
                    onChange={handleChange}
                  >
                    <MenuItem value="sync">Synchronous</MenuItem>
                    <MenuItem value="async">Asynchronous</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Async Type Selection (only when async is selected) */}
              {formData.action_type === 'async' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Async Type</InputLabel>
                    <Select
                      name="async_type"
                      value={formData.async_type}
                      label="Async Type"
                      onChange={handleChange}
                    >
                      <MenuItem value="polling">Polling-based</MenuItem>
                      <MenuItem value="webhook">Webhook-based</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Enhanced Parameter Configuration */}
          <Box sx={{ width: '100%' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="action configuration tabs">
              <Tab label="Path Parameters" />
              <Tab label="Query Parameters" />
              <Tab label="Headers" />
              {['POST', 'PUT', 'PATCH'].includes(formData.http_method) && <Tab label="Request Body" />}
              <Tab label="Success Logic" />
              {formData.action_type === 'async' && formData.async_type === 'polling' && <Tab label="Polling Configuration" />}
              {formData.action_type === 'async' && formData.async_type === 'webhook' && <Tab label="Webhook Configuration" />}
            </Tabs>

            {/* Path Parameters Tab */}
            <Box role="tabpanel" hidden={tabValue !== 0} sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Path Parameters Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure path parameters that will be substituted in the endpoint path using {`{paramName}`} syntax.
                    Example: /api/users/{`{userId}`}/documents/{`{documentId}`}
                  </Typography>
                  {renderParameterGrid(pathParams, updatePathParam, addPathParam, removePathParam, 'path')}
                </Box>
              )}
            </Box>

            {/* Query Parameters Tab */}
            <Box role="tabpanel" hidden={tabValue !== 1} sx={{ mt: 2 }}>
              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Query Parameters Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure query parameters with default values and validation rules. 
                    Mandatory parameters will be validated during rule execution.
                  </Typography>
                  {renderParameterGrid(queryParams, updateQueryParam, addQueryParam, removeQueryParam, 'query')}
                </Box>
              )}
            </Box>

            {/* Headers Tab */}
            <Box role="tabpanel" hidden={tabValue !== 2} sx={{ mt: 2 }}>
              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Headers Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Configure custom headers with default values and validation rules. 
                    Authentication headers are handled separately.
                  </Typography>
                  {renderParameterGrid(headers, updateHeader, addHeader, removeHeader, 'headers')}
                </Box>
              )}
            </Box>

            {/* Request Body Tab */}
            {['POST', 'PUT', 'PATCH'].includes(formData.http_method) && (
              <Box role="tabpanel" hidden={tabValue !== 3} sx={{ mt: 2 }}>
                {tabValue === 3 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Request Body Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Configure complex JSON request bodies with parameter binding. 
                      Use the template for structure and define parameters for dynamic values.
                    </Typography>
                    
                    {/* Body Parameters */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Request Body Parameters
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Define parameters that can be passed into the request body template using dot notation (e.g., "user.name", "settings.enabled").
                      </Typography>
                      {renderParameterGrid(bodyParams, updateBodyParam, addBodyParam, removeBodyParam, 'body')}
                    </Box>

                    {/* Request Body Template */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Request Body Template (JSON)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Define the structure of your request body. Parameters will be injected using dot notation.
                      </Typography>
                      <TextField
                        name="request_body_template"
                        value={formData.request_body_template}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        rows={6}
                        variant="outlined"
                        placeholder='{"user": {"name": null, "email": null}, "settings": {"active": true}}'
                      />
                    </Box>

                    {/* Fallback Request Body */}
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        Fallback Request Body (JSON)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Used when no template is provided or for backward compatibility.
                      </Typography>
                      <TextField
                        name="request_body"
                        value={formData.request_body}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        placeholder='{"key": "value"}'
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Success Logic Tab */}
            <Box role="tabpanel" hidden={tabValue !== (formData.http_method && ['POST', 'PUT', 'PATCH'].includes(formData.http_method) ? 4 : 3)} sx={{ mt: 2 }}>
              {tabValue === (formData.http_method && ['POST', 'PUT', 'PATCH'].includes(formData.http_method) ? 4 : 3) && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Custom Success Logic
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Define custom success criteria to validate API responses beyond HTTP status codes.
                    This allows you to mark API calls as failed even when they return HTTP 200 but don't meet your business logic requirements.
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enable_custom_success_logic}
                        onChange={(e) => setFormData(prev => ({ ...prev, enable_custom_success_logic: e.target.checked }))}
                        name="enable_custom_success_logic"
                      />
                    }
                    label="Enable Custom Success Logic"
                    sx={{ mb: 2 }}
                  />
                  
                  {formData.enable_custom_success_logic && (
                    <>
                      <TextField
                        name="success_criteria"
                        label="Success Criteria Expression"
                        value={formData.success_criteria}
                        onChange={(e) => setFormData(prev => ({ ...prev, success_criteria: e.target.value }))}
                        fullWidth
                        variant="outlined"
                        sx={{ mb: 2 }}
                        placeholder="status == 1 && data.documentId != null"
                        helperText="Use JavaScript-like expressions. Available: status, data, message, etc. Operators: ==, !=, &&, ||"
                      />
                      
                      <TextField
                        name="success_criteria_description"
                        label="Success Logic Description"
                        value={formData.success_criteria_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, success_criteria_description: e.target.value }))}
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={2}
                        placeholder="Describe what constitutes a successful response for this action"
                        helperText="Optional: Document your success criteria for other team members"
                      />
                      
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Expression Examples:
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                          • <code>status == 1</code> - Check status field equals 1
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                          • <code>data.documentId != null</code> - Ensure documentId exists
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                          • <code>status == 1 && data.errors.length == 0</code> - Success with no errors
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          • <code>response.success == true || status == "completed"</code> - Multiple success conditions
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </Box>
            
            {/* Dynamic tab calculation */}
            {(() => {
              let baseTabCount = 3; // Path, Query, Headers
              if (['POST', 'PUT', 'PATCH'].includes(formData.http_method)) baseTabCount += 1; // Request Body
              baseTabCount += 1; // Success Logic
              
              let currentTabIndex = baseTabCount;
              
              return (
                <>
                  {/* Polling Configuration Tab */}
                  {formData.action_type === 'async' && formData.async_type === 'polling' && (
                    <Box role="tabpanel" hidden={tabValue !== currentTabIndex} sx={{ mt: 2 }}>
                      {tabValue === currentTabIndex && (
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            Polling Configuration
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Configure the polling endpoint and parameters used to check the status of the async operation.
                          </Typography>
                          
                          {/* Polling endpoint configuration */}
                          <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={8}>
                              <TextField
                                name="polling_endpoint_path"
                                label="Polling Endpoint Path"
                                value={formData.polling_endpoint_path}
                                onChange={handleChange}
                                fullWidth
                                placeholder="/api/jobs/{jobId}/status"
                                helperText="Path for polling endpoint with optional parameters (e.g., /api/jobs/{jobId}/status)"
                              />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <FormControl fullWidth>
                                <InputLabel>Polling Method</InputLabel>
                                <Select
                                  name="polling_http_method"
                                  value={formData.polling_http_method}
                                  label="Polling Method"
                                  onChange={handleChange}
                                >
                                  <MenuItem value="GET">GET</MenuItem>
                                  <MenuItem value="POST">POST</MenuItem>
                                  <MenuItem value="PUT">PUT</MenuItem>
                                  <MenuItem value="PATCH">PATCH</MenuItem>
                                  <MenuItem value="DELETE">DELETE</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                          
                          {/* Polling frequency and attempts */}
                          <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                name="polling_frequency_seconds"
                                label="Polling Frequency (seconds)"
                                type="number"
                                value={formData.polling_frequency_seconds}
                                onChange={handleChange}
                                fullWidth
                                inputProps={{ min: 1, max: 3600 }}
                                helperText="How often to poll for results (1-3600 seconds)"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                name="max_polling_attempts"
                                label="Max Polling Attempts"
                                type="number"
                                value={formData.max_polling_attempts}
                                onChange={handleChange}
                                fullWidth
                                inputProps={{ min: 1, max: 100 }}
                                helperText="Maximum number of polling attempts before timeout"
                              />
                            </Grid>
                          </Grid>
                          
                          {/* Polling Parameters */}
                          <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>Polling Parameters</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  Polling Path Parameters
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  Path parameters for the polling endpoint (values can come from initial response).
                                </Typography>
                                {renderParameterGrid(pollingPathParams, updatePollingPathParam, addPollingPathParam, removePollingPathParam, 'path')}
                              </Box>
                              
                              <Divider sx={{ my: 2 }} />
                              
                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  Polling Query Parameters
                                </Typography>
                                {renderParameterGrid(pollingQueryParams, updatePollingQueryParam, addPollingQueryParam, removePollingQueryParam, 'simple')}
                              </Box>
                              
                              <Divider sx={{ my: 2 }} />
                              
                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  Polling Headers
                                </Typography>
                                {renderParameterGrid(pollingHeaders, updatePollingHeader, addPollingHeader, removePollingHeader, 'simple')}
                              </Box>
                              
                              {['POST', 'PUT', 'PATCH'].includes(formData.polling_http_method) && (
                                <>
                                  <Divider sx={{ my: 2 }} />
                                  <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                      Polling Request Body Parameters
                                    </Typography>
                                    {renderParameterGrid(pollingBodyParams, updatePollingBodyParam, addPollingBodyParam, removePollingBodyParam, 'body')}
                                  </Box>
                                </>
                              )}
                            </AccordionDetails>
                          </Accordion>
                          
                          {/* Response Parameter Mapping Section */}
                          <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>Response Parameter Mapping</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Map values from the initial API response to parameters used in polling requests.
                                This allows you to extract job IDs, request tokens, or other values needed for polling.
                              </Typography>
                              
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                  <Typography variant="subtitle1">
                                    Response Mappings
                                  </Typography>
                                  <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={addResponseMapping}
                                    size="small"
                                  >
                                    Add Mapping
                                  </Button>
                                </Box>
                                
                                {responseMapping.map((mapping, index) => (
                                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                                    <Grid container spacing={2} alignItems="center">
                                      <Grid item xs={12} sm={3}>
                                        <TextField
                                          label="Response Path"
                                          value={mapping.responsePath}
                                          onChange={(e) => updateResponseMapping(index, 'responsePath', e.target.value)}
                                          fullWidth
                                          size="small"
                                          placeholder="data.jobId"
                                          helperText="JSON path in response"
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <FormControl fullWidth size="small">
                                          <InputLabel>Target Type</InputLabel>
                                          <Select
                                            value={mapping.targetType}
                                            label="Target Type"
                                            onChange={(e) => updateResponseMapping(index, 'targetType', e.target.value)}
                                          >
                                            <MenuItem value="path">Path Param</MenuItem>
                                            <MenuItem value="query">Query Param</MenuItem>
                                            <MenuItem value="header">Header</MenuItem>
                                            <MenuItem value="body">Body Param</MenuItem>
                                          </Select>
                                        </FormControl>
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <TextField
                                          label="Target Parameter"
                                          value={mapping.targetParam}
                                          onChange={(e) => updateResponseMapping(index, 'targetParam', e.target.value)}
                                          fullWidth
                                          size="small"
                                          placeholder="jobId"
                                          helperText="Parameter name"
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={3}>
                                        <TextField
                                          label="JSON Path (optional)"
                                          value={mapping.jsonPath}
                                          onChange={(e) => updateResponseMapping(index, 'jsonPath', e.target.value)}
                                          fullWidth
                                          size="small"
                                          placeholder="data.jobId"
                                          helperText="Custom JSON path"
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <IconButton
                                          onClick={() => removeResponseMapping(index)}
                                          disabled={responseMapping.length === 1}
                                          color="error"
                                          size="small"
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                ))}
                              </Box>
                              
                              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Mapping Examples:
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  • Map <code>data.jobId</code> from response → <code>jobId</code> path parameter
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  • Map <code>requestToken</code> from response → <code>token</code> header
                                </Typography>
                                <Typography variant="body2">
                                  • Map <code>status.requestId</code> from response → <code>requestId</code> query parameter
                                </Typography>
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                          
                          {/* Async Success/Failure Criteria Section */}
                          <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography>Success & Failure Criteria</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Define when to consider the async operation complete, successful, or failed.
                                These criteria are evaluated against the polling response data.
                              </Typography>
                              
                              <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                  <Box sx={{ p: 2, border: '1px solid #4caf50', borderRadius: 1, bgcolor: 'success.light' }}>
                                    <Typography variant="subtitle1" gutterBottom color="success.dark">
                                      Success Criteria
                                    </Typography>
                                    <TextField
                                      name="async_success_criteria"
                                      label="Success Expression"
                                      value={formData.async_success_criteria}
                                      onChange={handleChange}
                                      fullWidth
                                      variant="outlined"
                                      sx={{ mb: 2, bgcolor: 'white' }}
                                      placeholder='data.status == "completed" && data.result != null'
                                      helperText="When this expression is true, the async operation is considered successful"
                                    />
                                    
                                    <TextField
                                      name="async_success_description"
                                      label="Success Description"
                                      value={formData.async_success_description}
                                      onChange={handleChange}
                                      fullWidth
                                      variant="outlined"
                                      multiline
                                      rows={2}
                                      sx={{ bgcolor: 'white' }}
                                      placeholder="Describe what indicates successful completion"
                                    />
                                  </Box>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                  <Box sx={{ p: 2, border: '1px solid #f44336', borderRadius: 1, bgcolor: 'error.light' }}>
                                    <Typography variant="subtitle1" gutterBottom color="error.dark">
                                      Failure Criteria
                                    </Typography>
                                    <TextField
                                      name="async_failure_criteria"
                                      label="Failure Expression"
                                      value={formData.async_failure_criteria}
                                      onChange={handleChange}
                                      fullWidth
                                      variant="outlined"
                                      sx={{ mb: 2, bgcolor: 'white' }}
                                      placeholder='data.status == "failed" || data.error != null'
                                      helperText="When this expression is true, the async operation is considered failed"
                                    />
                                    
                                    <TextField
                                      name="async_failure_description"
                                      label="Failure Description"
                                      value={formData.async_failure_description}
                                      onChange={handleChange}
                                      fullWidth
                                      variant="outlined"
                                      multiline
                                      rows={2}
                                      sx={{ bgcolor: 'white' }}
                                      placeholder="Describe what indicates failure"
                                    />
                                  </Box>
                                </Grid>
                              </Grid>
                              
                              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Expression Examples:
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  • <code>data.status == "completed"</code> - Check if status field equals "completed"
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  • <code>data.result != null && data.progress == 100</code> - Success when result exists and progress is 100%
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  • <code>data.status == "failed" || data.error != null</code> - Fail if status is "failed" or error exists
                                </Typography>
                                <Typography variant="body2">
                                  • <code>data.processing == false</code> - Success when processing is complete
                                </Typography>
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* Webhook Configuration Tab */}
                  {formData.action_type === 'async' && formData.async_type === 'webhook' && (() => {
                    currentTabIndex = baseTabCount;
                    return (
                      <Box role="tabpanel" hidden={tabValue !== currentTabIndex} sx={{ mt: 2 }}>
                        {tabValue === currentTabIndex && (
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              Webhook Configuration
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Configure how the system will receive webhook callbacks for async operation completion.
                            </Typography>
                            
                            {/* Webhook Type Selection */}
                            <FormControl fullWidth sx={{ mb: 3 }}>
                              <InputLabel>Webhook URL Type</InputLabel>
                              <Select
                                name="webhook_type"
                                value={formData.webhook_type || 'dynamic'}
                                label="Webhook URL Type"
                                onChange={handleChange}
                              >
                                <MenuItem value="dynamic">Dynamic URL (unique per execution)</MenuItem>
                                <MenuItem value="static">Static URL (shared endpoint)</MenuItem>
                              </Select>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {(formData.webhook_type || 'dynamic') === 'dynamic' 
                                  ? 'Each execution gets a unique webhook URL. Simpler to implement.'
                                  : 'Single webhook URL for all executions. Requires identifier mapping.'}
                              </Typography>
                            </FormControl>
                            
                            {/* Webhook URL Injection */}
                            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                              Webhook URL Injection
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Configure how to provide the webhook URL to the external API.
                            </Typography>
                            
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                  <InputLabel>Injection Method</InputLabel>
                                  <Select
                                    name="webhook_url_injection_method"
                                    value={formData.webhook_url_injection_method || ''}
                                    label="Injection Method"
                                    onChange={handleChange}
                                  >
                                    <MenuItem value="">-- Select Method --</MenuItem>
                                    <MenuItem value="query">Query Parameter</MenuItem>
                                    <MenuItem value="body">Body Parameter</MenuItem>
                                    <MenuItem value="path">Path Parameter</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  name="webhook_url_injection_param"
                                  label="Parameter Name/Path"
                                  value={formData.webhook_url_injection_param || ''}
                                  onChange={handleChange}
                                  fullWidth
                                  placeholder={getInjectionPlaceholder()}
                                  helperText={getInjectionHelperText()}
                                />
                              </Grid>
                            </Grid>
                            
                            {/* Timeout Configuration */}
                            <TextField
                              name="webhook_timeout_seconds"
                              label="Webhook Timeout (seconds)"
                              type="number"
                              value={formData.webhook_timeout_seconds || 3600}
                              onChange={handleChange}
                              fullWidth
                              sx={{ mb: 3 }}
                              helperText="How long to wait for webhook callback (default: 1 hour)"
                              inputProps={{ min: 60, max: 86400 }}
                            />
                            
                            {/* Static Webhook Identifier Mapping */}
                            {(formData.webhook_type || 'dynamic') === 'static' && (
                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  Identifier Mapping
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                  Map fields from the initial response to webhook payload for matching executions.
                                </Typography>
                                
                                <Box sx={{ mb: 2 }}>
                                  <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={addIdentifierMapping}
                                    size="small"
                                    sx={{ mb: 2 }}
                                  >
                                    Add Identifier Mapping
                                  </Button>
                                  
                                  {identifierMapping.map((mapping, index) => (
                                    <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
                                      <Grid item xs={12} sm={5}>
                                        <TextField
                                          label="Initial Response Field"
                                          value={mapping.initialField}
                                          onChange={(e) => updateIdentifierMapping(index, 'initialField', e.target.value)}
                                          fullWidth
                                          size="small"
                                          placeholder="data.jobId"
                                          helperText="Dot notation path to field in initial response"
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={5}>
                                        <TextField
                                          label="Webhook Payload Field"
                                          value={mapping.webhookField}
                                          onChange={(e) => updateIdentifierMapping(index, 'webhookField', e.target.value)}
                                          fullWidth
                                          size="small"
                                          placeholder="jobId"
                                          helperText="Field name in webhook payload"
                                        />
                                      </Grid>
                                      <Grid item xs={12} sm={2}>
                                        <IconButton
                                          onClick={() => removeIdentifierMapping(index)}
                                          disabled={identifierMapping.length === 1}
                                          color="error"
                                          size="small"
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Grid>
                                    </Grid>
                                  ))}
                                </Box>
                              </Box>
                            )}
                            
                            {/* Webhook Success/Failure Criteria */}
                            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                              Webhook Success & Failure Criteria
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Define expressions to evaluate webhook responses for completion status.
                            </Typography>
                            
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  name="webhook_success_criteria"
                                  label="Success Criteria"
                                  value={formData.webhook_success_criteria || ''}
                                  onChange={handleChange}
                                  fullWidth
                                  multiline
                                  rows={2}
                                  placeholder='data.status == "completed"'
                                  helperText="Expression to identify successful completion"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  name="webhook_failure_criteria"
                                  label="Failure Criteria"
                                  value={formData.webhook_failure_criteria || ''}
                                  onChange={handleChange}
                                  fullWidth
                                  multiline
                                  rows={2}
                                  placeholder='data.status == "failed"'
                                  helperText="Expression to identify failure"
                                />
                              </Grid>
                            </Grid>
                            
                            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Webhook System
                              </Typography>
                              <Typography variant="body2">
                                The system automatically generates webhook URLs and handles callbacks. 
                                Webhook URLs are injected into your initial API call, and responses are evaluated 
                                against your success/failure criteria to determine completion.
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                  
                  {/* Async Success/Failure Criteria Tab */}
                  {formData.action_type === 'async' && (() => {
                    // Calculate tab index based on async type
                    let asyncCriteriaIndex = baseTabCount + 1;
                    if (formData.async_type === 'polling') {
                      asyncCriteriaIndex += 2; // Polling Config + Response Mapping
                    } else if (formData.async_type === 'webhook') {
                      asyncCriteriaIndex += 1; // Webhook Config
                    }
                    
                    return (
                      <Box role="tabpanel" hidden={tabValue !== asyncCriteriaIndex} sx={{ mt: 2 }}>
                        {tabValue === asyncCriteriaIndex && (
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              Async Success & Failure Criteria
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Define when to consider the async operation complete, successful, or failed.
                              These criteria are evaluated against the polling response data.
                            </Typography>
                            
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={6}>
                                <Box sx={{ p: 2, border: '1px solid #4caf50', borderRadius: 1, bgcolor: 'success.light' }}>
                                  <Typography variant="subtitle1" gutterBottom color="success.dark">
                                    Success Criteria
                                  </Typography>
                                  <TextField
                                    name="async_success_criteria"
                                    label="Success Expression"
                                    value={formData.async_success_criteria}
                                    onChange={handleChange}
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mb: 2, bgcolor: 'white' }}
                                    placeholder='data.status == "completed" && data.result != null'
                                    helperText="When this expression is true, the async operation is considered successful"
                                  />
                                  
                                  <TextField
                                    name="async_success_description"
                                    label="Success Description"
                                    value={formData.async_success_description}
                                    onChange={handleChange}
                                    fullWidth
                                    variant="outlined"
                                    multiline
                                    rows={2}
                                    sx={{ bgcolor: 'white' }}
                                    placeholder="Describe what indicates successful completion"
                                  />
                                </Box>
                              </Grid>
                              
                              <Grid item xs={12} md={6}>
                                <Box sx={{ p: 2, border: '1px solid #f44336', borderRadius: 1, bgcolor: 'error.light' }}>
                                  <Typography variant="subtitle1" gutterBottom color="error.dark">
                                    Failure Criteria
                                  </Typography>
                                  <TextField
                                    name="async_failure_criteria"
                                    label="Failure Expression"
                                    value={formData.async_failure_criteria}
                                    onChange={handleChange}
                                    fullWidth
                                    variant="outlined"
                                    sx={{ mb: 2, bgcolor: 'white' }}
                                    placeholder='data.status == "failed" || data.error != null'
                                    helperText="When this expression is true, the async operation is considered failed"
                                  />
                                  
                                  <TextField
                                    name="async_failure_description"
                                    label="Failure Description"
                                    value={formData.async_failure_description}
                                    onChange={handleChange}
                                    fullWidth
                                    variant="outlined"
                                    multiline
                                    rows={2}
                                    sx={{ bgcolor: 'white' }}
                                    placeholder="Describe what indicates failure"
                                  />
                                </Box>
                              </Grid>
                            </Grid>
                            
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Expression Examples:
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                <strong>Success:</strong> <code>data.status == "completed"</code>
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                <strong>Success:</strong> <code>progress == 100 && errors.length == 0</code>
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                <strong>Failure:</strong> <code>data.status == "failed"</code>
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                <strong>Failure:</strong> <code>error != null || data.errorCode > 0</code>
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                If neither success nor failure criteria are met, polling will continue until max attempts is reached.
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                </>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {action ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EnhancedActionForm;