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
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import notification from '@leegality/leegality-react-component-library/dist/notification';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as TestIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { customAuthConfigsApi, credentialsApi } from '../services/api';

const CustomAuthConfigDialog = ({ open, onClose, credentialId, onSave }) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingConfig, setEditingConfig] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);

  // Load existing configurations when dialog opens
  useEffect(() => {
    if (open && credentialId) {
      loadConfigs();
    }
  }, [open, credentialId]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await customAuthConfigsApi.getAll(credentialId);
      setConfigs(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = () => {
    setEditingConfig({
      key_name: '',
      value_type: 'static',
      static_value: '',
      api_url: '',
      api_method: 'POST',
      api_headers: {},
      api_query_params: {},
      api_body: {},
      response_path: '',
      cache_duration_minutes: 60,
    });
    setShowConfigForm(true);
  };

  const handleEditConfig = (config) => {
    setEditingConfig({...config});
    setShowConfigForm(true);
  };

  const handleDeleteConfig = async (configId) => {
    try {
      await customAuthConfigsApi.delete(configId);
      loadConfigs();
    } catch (err) {
      setError('Failed to delete configuration');
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      const dataWithCredential = {
        ...configData,
        credential: credentialId
      };

      if (editingConfig.id) {
        await customAuthConfigsApi.update(editingConfig.id, dataWithCredential);
      } else {
        await customAuthConfigsApi.create(dataWithCredential);
      }
      
      setShowConfigForm(false);
      setEditingConfig(null);
      loadConfigs();
    } catch (err) {
      setError('Failed to save configuration');
    }
  };

  const handleTestConfig = async (config) => {
    if (config.value_type !== 'dynamic') {
      setError('Can only test dynamic configurations');
      return;
    }

    try {
      const response = await customAuthConfigsApi.testApi(config.id);
      // Handle test result
      notification.success('Test successful!', `Token extracted: ${response.data.token_extracted ? 'Yes' : 'No'}`);
    } catch (err) {
      notification.error('Test failed', err.response?.data?.error || 'Unknown error');
    }
  };

  const handleClose = () => {
    if (onSave) {
      onSave(configs);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Custom Authentication Configuration</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Authentication Parameters</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddConfig}
              >
                Add Parameter
              </Button>
            </Box>

            {configs.length === 0 ? (
              <Alert severity="info">
                No authentication parameters configured. Click "Add Parameter" to get started.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Parameter Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Value/Configuration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{config.key_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={config.value_type === 'static' ? 'Static' : 'Dynamic'} 
                            color={config.value_type === 'static' ? 'default' : 'primary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {config.value_type === 'static' ? (
                            <Typography variant="body2">***hidden***</Typography>
                          ) : (
                            <Box>
                              <Typography variant="caption" display="block">
                                URL: {config.api_url}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Method: {config.api_method}
                              </Typography>
                              {config.response_path && (
                                <Typography variant="caption" display="block">
                                  Path: {config.response_path}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          {config.value_type === 'dynamic' && config.cached_at ? (
                            <Chip label="Cached" color="success" size="small" />
                          ) : (
                            <Chip label="Not cached" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditConfig(config)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          {config.value_type === 'dynamic' && (
                            <IconButton 
                              size="small" 
                              onClick={() => handleTestConfig(config)}
                              color="success"
                            >
                              <TestIcon />
                            </IconButton>
                          )}
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteConfig(config.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {configs.length > 0 ? 'Save & Close' : 'Close'}
        </Button>
      </DialogActions>

      {/* Configuration Form Dialog */}
      {showConfigForm && (
        <CustomAuthConfigForm
          open={showConfigForm}
          onClose={() => {
            setShowConfigForm(false);
            setEditingConfig(null);
          }}
          onSave={handleSaveConfig}
          config={editingConfig}
        />
      )}
    </Dialog>
  );
};

// Separate component for the configuration form
const CustomAuthConfigForm = ({ open, onClose, onSave, config }) => {
  const [formData, setFormData] = useState(config || {});
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setFormData(config || {
      key_name: '',
      value_type: 'static',
      static_value: '',
      api_url: '',
      api_method: 'POST',
      api_headers: {},
      api_query_params: {},
      api_body: {},
      response_path: '',
      cache_duration_minutes: 60,
    });
  }, [config]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Reset test results when configuration changes
    setTestResult(null);
  };

  const handleJsonChange = (field, value) => {
    try {
      const jsonValue = JSON.parse(value);
      setFormData({
        ...formData,
        [field]: jsonValue,
      });
    } catch (err) {
      // Keep the string value for now, validation will catch it
      setFormData({
        ...formData,
        [field]: value,
      });
    }
  };

  const handleTestApi = async () => {
    if (formData.value_type !== 'dynamic') {
      setError('Can only test dynamic configurations');
      return;
    }

    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      const response = await credentialsApi.testCustomAuth({
        api_url: formData.api_url,
        api_method: formData.api_method,
        api_headers: formData.api_headers,
        api_query_params: formData.api_query_params,
        api_body: formData.api_body,
        response_path: formData.response_path,
      });

      setTestResult(response.data);
    } catch (err) {
      setTestResult(err.response?.data || { error: 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.key_name) {
      setError('Parameter name is required');
      return;
    }

    if (formData.value_type === 'static' && !formData.static_value) {
      setError('Static value is required for static type');
      return;
    }

    if (formData.value_type === 'dynamic' && !formData.api_url) {
      setError('API URL is required for dynamic type');
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {config?.id ? 'Edit' : 'Add'} Authentication Parameter
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            name="key_name"
            label="Parameter Name"
            value={formData.key_name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            helperText="e.g., 'Authorization', 'X-Auth-Token', 'X-API-Key'"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Value Type</InputLabel>
            <Select
              name="value_type"
              value={formData.value_type}
              onChange={handleChange}
              label="Value Type"
            >
              <MenuItem value="static">Static Value</MenuItem>
              <MenuItem value="dynamic">Dynamic from API</MenuItem>
            </Select>
          </FormControl>

          {formData.value_type === 'static' ? (
            <TextField
              name="static_value"
              label="Static Value"
              type="password"
              value={formData.static_value}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="The static authentication value"
            />
          ) : formData.value_type === 'dynamic' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Dynamic API Configuration
              </Typography>
              
              <TextField
                name="api_url"
                label="API URL"
                value={formData.api_url}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
                helperText="API endpoint to fetch the token from"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>HTTP Method</InputLabel>
                <Select
                  name="api_method"
                  value={formData.api_method}
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
                name="response_path"
                label="Response Path"
                value={formData.response_path}
                onChange={handleChange}
                fullWidth
                margin="normal"
                helperText="JSON path to extract token (e.g., 'access_token', 'data.token')"
              />

              <TextField
                name="cache_duration_minutes"
                label="Cache Duration (minutes)"
                type="number"
                value={formData.cache_duration_minutes}
                onChange={handleChange}
                fullWidth
                margin="normal"
                helperText="How long to cache the fetched token"
              />

              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Configuration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="API Headers (JSON)"
                      multiline
                      rows={3}
                      value={typeof formData.api_headers === 'string' ? formData.api_headers : JSON.stringify(formData.api_headers, null, 2)}
                      onChange={(e) => handleJsonChange('api_headers', e.target.value)}
                      fullWidth
                      helperText="Headers for the API request"
                    />

                    <TextField
                      label="Query Parameters (JSON)"
                      multiline
                      rows={3}
                      value={typeof formData.api_query_params === 'string' ? formData.api_query_params : JSON.stringify(formData.api_query_params, null, 2)}
                      onChange={(e) => handleJsonChange('api_query_params', e.target.value)}
                      fullWidth
                      helperText="Query parameters for the API request"
                    />

                    <TextField
                      label="Request Body (JSON)"
                      multiline
                      rows={4}
                      value={typeof formData.api_body === 'string' ? formData.api_body : JSON.stringify(formData.api_body, null, 2)}
                      onChange={(e) => handleJsonChange('api_body', e.target.value)}
                      fullWidth
                      helperText="Request body for POST/PUT/PATCH requests"
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              {formData.value_type === 'dynamic' && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestApi}
                    disabled={testing || !formData.api_url}
                    startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
                    sx={{ mb: 2 }}
                  >
                    {testing ? 'Testing...' : 'Test API Configuration'}
                  </Button>

                  {testResult && (
                    <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          {testResult.success ? testResult.message : testResult.error}
                        </Typography>
                        
                        {testResult.success && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" display="block">
                              Status: {testResult.status_code} | Response time: {testResult.response_time_ms}ms
                            </Typography>
                            <Typography variant="caption" display="block">
                              Token extracted: {testResult.token_extracted ? 'Yes' : 'No'}
                            </Typography>
                            {testResult.extracted_token_preview && (
                              <Typography variant="caption" display="block">
                                Token preview: {testResult.extracted_token_preview}
                              </Typography>
                            )}
                          </Box>
                        )}

                        {testResult.error_details && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Details: {testResult.error_details}
                          </Typography>
                        )}
                      </Box>
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {config?.id ? 'Update' : 'Add'} Parameter
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomAuthConfigDialog;