import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  Box,
  CircularProgress,
  Chip,
  IconButton,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { connectorsApi, actionsApi } from '../services/api';

const TestConnection = ({ open, onClose, connector, action = null }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customParams, setCustomParams] = useState([{ key: '', value: '' }]);
  const [customHeaders, setCustomHeaders] = useState([{ key: '', value: '' }]);
  const [customBody, setCustomBody] = useState('{}');
  const [error, setError] = useState('');

  const validateJSON = (jsonString) => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  // Helper functions for key-value pairs
  const addParam = () => {
    setCustomParams([...customParams, { key: '', value: '' }]);
  };

  const removeParam = (index) => {
    if (customParams.length > 1) {
      setCustomParams(customParams.filter((_, i) => i !== index));
    }
  };

  const updateParam = (index, field, value) => {
    const updated = [...customParams];
    updated[index][field] = value;
    setCustomParams(updated);
  };

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (index) => {
    if (customHeaders.length > 1) {
      setCustomHeaders(customHeaders.filter((_, i) => i !== index));
    }
  };

  const updateHeader = (index, field, value) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  // Convert key-value pairs to object
  const keyValueToObject = (pairs) => {
    const obj = {};
    pairs.forEach(pair => {
      if (pair.key.trim()) {
        obj[pair.key.trim()] = pair.value;
      }
    });
    return obj;
  };

  // Pre-populate form with action defaults when dialog opens
  useEffect(() => {
    if (open && action) {
      // Pre-populate with action's default parameters and headers
      if (action.query_params && Object.keys(action.query_params).length > 0) {
        setCustomParams(Object.entries(action.query_params).map(([key, value]) => ({ key, value })));
      }
      if (action.headers && Object.keys(action.headers).length > 0) {
        setCustomHeaders(Object.entries(action.headers).map(([key, value]) => ({ key, value })));
      }
      if (action.request_body && Object.keys(action.request_body).length > 0) {
        setCustomBody(JSON.stringify(action.request_body, null, 2));
      }
    } else if (open && !action) {
      // Reset to defaults when no action
      setCustomParams([{ key: '', value: '' }]);
      setCustomHeaders([{ key: '', value: '' }]);
      setCustomBody('{}');
    }
  }, [open, action]);

  const handleTest = async () => {
    // Validate JSON input for body only
    if (!validateJSON(customBody)) {
      setError('Invalid JSON in Custom Body');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const testData = {
        custom_params: keyValueToObject(customParams),
        custom_headers: keyValueToObject(customHeaders),
        custom_body: JSON.parse(customBody),
      };

      let response;
      if (action) {
        response = await actionsApi.test(action.id, testData);
      } else {
        response = await connectorsApi.test(connector.id, testData);
      }

      setResult(response.data);
    } catch (err) {
      // Enhanced error handling with complete error details
      console.error('Test Connection Error:', err);
      
      let errorDetails = {
        message: 'Test failed',
        status: null,
        statusText: null,
        data: null,
        url: null,
        method: null,
      };

      if (err.response) {
        // Server responded with error status
        errorDetails = {
          message: err.response.data?.error || err.response.data?.detail || 'Server error',
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          url: err.response.config?.url,
          method: err.response.config?.method?.toUpperCase(),
          fullError: err.response.data,
        };
      } else if (err.request) {
        // Request was made but no response received
        errorDetails = {
          message: 'No response received from server',
          networkError: true,
          url: err.config?.url,
          method: err.config?.method?.toUpperCase(),
        };
      } else {
        // Something else happened
        errorDetails = {
          message: err.message || 'Unknown error occurred',
        };
      }

      setResult({
        success: false,
        error: errorDetails.message,
        errorDetails: errorDetails,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError('');
    setCustomParams([{ key: '', value: '' }]);
    setCustomHeaders([{ key: '', value: '' }]);
    setCustomBody('{}');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Test Connection - {connector?.name}
        {action && ` / ${action.name}`}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* Custom Query Parameters */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              Custom Query Parameters
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addParam}
              variant="outlined"
            >
              Add Parameter
            </Button>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
            {action ? 'Action defaults loaded. Modify values as needed for testing.' : 'Add custom query parameters for testing.'}
          </Typography>
          {customParams.map((param, index) => (
            <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
              <Grid item xs={5}>
                <TextField
                  placeholder="Parameter name"
                  value={param.key}
                  onChange={(e) => updateParam(index, 'key', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  placeholder="Parameter value (optional)"
                  value={param.value}
                  onChange={(e) => updateParam(index, 'value', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton
                  onClick={() => removeParam(index)}
                  disabled={customParams.length === 1}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
        </Box>
        
        {/* Custom Headers */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              Custom Headers
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addHeader}
              variant="outlined"
            >
              Add Header
            </Button>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
            {action ? 'Action defaults loaded. Modify values as needed for testing.' : 'Add custom headers for testing.'}
          </Typography>
          {customHeaders.map((header, index) => (
            <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
              <Grid item xs={5}>
                <TextField
                  placeholder="Header name"
                  value={header.key}
                  onChange={(e) => updateHeader(index, 'key', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  placeholder="Header value (optional)"
                  value={header.value}
                  onChange={(e) => updateHeader(index, 'value', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton
                  onClick={() => removeHeader(index)}
                  disabled={customHeaders.length === 1}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Custom Request Body (JSON)
          </Typography>
          <TextField
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder='{"key": "value"}'
          />
        </Box>

        {result && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Test Result
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip 
                label={result.success ? 'Success' : 'Failed'} 
                color={result.success ? 'success' : 'error'} 
              />
              {result.status_code && (
                <Chip label={`Status: ${result.status_code}`} variant="outlined" />
              )}
              {result.response_time_ms && (
                <Chip label={`${result.response_time_ms}ms`} variant="outlined" />
              )}
            </Box>
            
            {result.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Message:
                </Typography>
                {result.error}
              </Alert>
            )}

            {/* Enhanced Error Details */}
            {(result.errorDetails || result.error_type || result.error_details) && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Debug Information:
                </Typography>
                <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1, mb: 2 }}>
                  {/* From frontend error handling */}
                  {result.errorDetails?.status && (
                    <Typography variant="body2">
                      <strong>HTTP Status:</strong> {result.errorDetails.status} {result.errorDetails.statusText}
                    </Typography>
                  )}
                  {result.errorDetails?.method && result.errorDetails?.url && (
                    <Typography variant="body2">
                      <strong>Request:</strong> {result.errorDetails.method} {result.errorDetails.url}
                    </Typography>
                  )}
                  {result.errorDetails?.networkError && (
                    <Typography variant="body2" color="error">
                      <strong>Network Error:</strong> Cannot connect to server. Check if the backend is running.
                    </Typography>
                  )}
                  
                  {/* From backend error handling */}
                  {result.error_type && (
                    <Typography variant="body2">
                      <strong>Error Type:</strong> {result.error_type}
                    </Typography>
                  )}
                  {result.error_details && (
                    <Typography variant="body2">
                      <strong>Details:</strong> {result.error_details}
                    </Typography>
                  )}
                  {result.url && (
                    <Typography variant="body2">
                      <strong>Target URL:</strong> {result.url}
                    </Typography>
                  )}
                </Box>
                
                {/* Possible causes for connection errors */}
                {result.possible_causes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Possible Causes:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {result.possible_causes.map((cause, index) => (
                        <Typography component="li" variant="body2" key={index}>
                          {cause}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
                
                {/* Full error response from frontend or backend */}
                {(result.errorDetails?.fullError || result.body) && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Full Error Response:
                    </Typography>
                    <TextField
                      value={JSON.stringify(result.errorDetails?.fullError || result.body, null, 2)}
                      fullWidth
                      multiline
                      rows={6}
                      variant="outlined"
                      InputProps={{ readOnly: true }}
                      sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                    />
                  </Box>
                )}
              </Box>
            )}
            
            {result.response_preview && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Response Preview:
                </Typography>
                <TextField
                  value={result.response_preview}
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  InputProps={{ readOnly: true }}
                  sx={{ fontFamily: 'monospace' }}
                />
              </Box>
            )}

            {/* Show full successful response if available */}
            {result.success && result.body && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Full Response Body:
                </Typography>
                <TextField
                  value={typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
                  fullWidth
                  multiline
                  rows={8}
                  variant="outlined"
                  InputProps={{ readOnly: true }}
                  sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </Box>
            )}

            {/* Show request details for debugging */}
            {(result.url || result.request_details) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Request Details:
                </Typography>
                {result.url && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>URL:</strong> {result.url}
                  </Typography>
                )}
                {result.request_details && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Method:</strong> {result.request_details.method}
                    </Typography>
                    {result.request_details.params && Object.keys(result.request_details.params).length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>Query Parameters:</strong>
                        </Typography>
                        <TextField
                          value={JSON.stringify(result.request_details.params, null, 2)}
                          fullWidth
                          multiline
                          rows={2}
                          variant="outlined"
                          InputProps={{ readOnly: true }}
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 0.5 }}
                        />
                      </Box>
                    )}
                    {result.request_details.headers && Object.keys(result.request_details.headers).length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>Headers:</strong>
                        </Typography>
                        <TextField
                          value={JSON.stringify(result.request_details.headers, null, 2)}
                          fullWidth
                          multiline
                          rows={3}
                          variant="outlined"
                          InputProps={{ readOnly: true }}
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 0.5 }}
                        />
                      </Box>
                    )}
                    {result.request_details.body && Object.keys(result.request_details.body).length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          <strong>Request Body:</strong>
                        </Typography>
                        <TextField
                          value={JSON.stringify(result.request_details.body, null, 2)}
                          fullWidth
                          multiline
                          rows={3}
                          variant="outlined"
                          InputProps={{ readOnly: true }}
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 0.5 }}
                        />
                      </Box>
                    )}
                  </Box>
                )}
                {result.headers && !result.request_details && (
                  <Box>
                    <Typography variant="body2">
                      <strong>Response Headers:</strong>
                    </Typography>
                    <TextField
                      value={JSON.stringify(result.headers, null, 2)}
                      fullWidth
                      multiline
                      rows={4}
                      variant="outlined"
                      InputProps={{ readOnly: true }}
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 0.5 }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button 
          onClick={handleTest} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TestConnection;