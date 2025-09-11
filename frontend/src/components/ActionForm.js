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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const ActionForm = ({ open, onClose, onSave, action = null, connectorId }) => {
  const [formData, setFormData] = useState({
    connector: connectorId,
    name: '',
    description: '',
    http_method: 'GET',
    endpoint_path: '',
    request_body: '{}',
  });
  const [queryParams, setQueryParams] = useState([{ key: '', value: '' }]);
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [error, setError] = useState('');

  // Helper functions for key-value pairs
  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
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
    setHeaders([...headers, { key: '', value: '' }]);
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

  // Convert object to key-value pairs
  const objectToKeyValue = (obj) => {
    if (!obj || Object.keys(obj).length === 0) {
      return [{ key: '', value: '' }];
    }
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
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
      });
      setQueryParams(objectToKeyValue(action.query_params));
      setHeaders(objectToKeyValue(action.headers));
    } else {
      setFormData({
        connector: connectorId,
        name: '',
        description: '',
        http_method: 'GET',
        endpoint_path: '',
        request_body: '{}',
      });
      setQueryParams([{ key: '', value: '' }]);
      setHeaders([{ key: '', value: '' }]);
    }
    setError('');
  }, [action, open, connectorId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
    
    // Validate JSON field for request body only
    if (!validateJSON(formData.request_body)) {
      setError('Invalid JSON in Request Body');
      return;
    }

    try {
      const submitData = {
        ...formData,
        query_params: keyValueToObject(queryParams),
        headers: keyValueToObject(headers),
        request_body: JSON.parse(formData.request_body),
      };
      await onSave(submitData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save action');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {action ? 'Edit Action' : 'New Action'}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
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
          
          <FormControl fullWidth margin="normal">
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
          
          <TextField
            name="endpoint_path"
            label="Endpoint Path"
            value={formData.endpoint_path}
            onChange={handleChange}
            fullWidth
            margin="normal"
            helperText="Path to append to base URL (e.g., /api/users)"
          />
          
          {/* Query Parameters */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Default Query Parameters
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addQueryParam}
                variant="outlined"
              >
                Add Parameter
              </Button>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              Define default query parameters. Values can be overridden when the action is called from the rule engine.
            </Typography>
            {queryParams.map((param, index) => (
              <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
                <Grid item xs={5}>
                  <TextField
                    placeholder="Parameter name"
                    value={param.key}
                    onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    placeholder="Default value (optional)"
                    value={param.value}
                    onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton
                    onClick={() => removeQueryParam(index)}
                    disabled={queryParams.length === 1}
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
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Default Custom Headers
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
              Define default custom headers. Values can be overridden when the action is called from the rule engine.
            </Typography>
            {headers.map((header, index) => (
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
                    placeholder="Default value (optional)"
                    value={header.value}
                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton
                    onClick={() => removeHeader(index)}
                    disabled={headers.length === 1}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Box>
          
          {['POST', 'PUT', 'PATCH'].includes(formData.http_method) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Request Body (JSON)
              </Typography>
              <TextField
                name="request_body"
                value={formData.request_body}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder='{"key": "value", "nested": {"key": "value"}}'
              />
            </Box>
          )}
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

export default ActionForm;