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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const APIConfigDrawer = ({ open, onClose, nodeData, onSave }) => {
  const [apiConfig, setApiConfig] = useState({
    name: '',
    url: '',
    method: 'GET',
    headers: [],
    body: '',
  });
  const [currentTab, setCurrentTab] = useState(0);
  const [headerForm, setHeaderForm] = useState({ key: '', value: '' });

  useEffect(() => {
    if (nodeData && nodeData.apiConfig) {
      setApiConfig({
        name: nodeData.apiConfig.name || '',
        url: nodeData.apiConfig.url || '',
        method: nodeData.apiConfig.method || 'GET',
        headers: nodeData.apiConfig.headers || [],
        body: nodeData.apiConfig.body || '',
      });
    }
  }, [nodeData]);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setApiConfig({
      ...apiConfig,
      [name]: value,
    });
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleHeaderFormChange = (e) => {
    const { name, value } = e.target;
    setHeaderForm({
      ...headerForm,
      [name]: value,
    });
  };

  const handleAddHeader = () => {
    if (!headerForm.key || !headerForm.value) {
      return;
    }

    setApiConfig({
      ...apiConfig,
      headers: [...apiConfig.headers, { ...headerForm }],
    });

    setHeaderForm({ key: '', value: '' });
  };

  const handleDeleteHeader = (index) => {
    const updatedHeaders = apiConfig.headers.filter((_, i) => i !== index);
    setApiConfig({
      ...apiConfig,
      headers: updatedHeaders,
    });
  };

  const handleSave = () => {
    // Ensure we preserve all node data including nodeType
    const updatedData = {
      ...nodeData,
      nodeType: nodeData?.nodeType || 'api_call', // Ensure nodeType is always set
      apiConfig: apiConfig,
    };

    console.log('APIConfigDrawer saving data:', updatedData);
    onSave(updatedData);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 500 },
      }}
      sx={{
        zIndex: 10000, // Higher than SequenceBuilder's 9999
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
            Configure API Call
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Basic Config */}
          <Box sx={{ p: 2 }}>
            <TextField
              name="name"
              label="API Name"
              value={apiConfig.name}
              onChange={handleConfigChange}
              fullWidth
              size="small"
              margin="normal"
              placeholder="e.g., Fetch User Data"
              helperText="A descriptive name for this API call"
            />

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                select
                name="method"
                label="Method"
                value={apiConfig.method}
                onChange={handleConfigChange}
                size="small"
                sx={{ width: 120 }}
              >
                {httpMethods.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                name="url"
                label="URL"
                value={apiConfig.url}
                onChange={handleConfigChange}
                fullWidth
                size="small"
                placeholder="https://api.example.com/endpoint"
                helperText="The full URL of the API endpoint"
              />
            </Box>
          </Box>

          <Divider />

          {/* Tabs for Headers and Body */}
          <Box>
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Headers" />
              <Tab label="Body" />
            </Tabs>

            {/* Headers Tab */}
            {currentTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Request Headers
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    name="key"
                    label="Header Name"
                    value={headerForm.key}
                    onChange={handleHeaderFormChange}
                    size="small"
                    placeholder="Content-Type"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    name="value"
                    label="Header Value"
                    value={headerForm.value}
                    onChange={handleHeaderFormChange}
                    size="small"
                    placeholder="application/json"
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddHeader}
                    disabled={!headerForm.key || !headerForm.value}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>

                {apiConfig.headers.length === 0 ? (
                  <Box
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: '#f9fafb',
                      borderRadius: 1,
                      border: '1px dashed #d1d5db',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No headers configured. Add headers above.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {apiConfig.headers.map((header, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          mb: 1,
                          backgroundColor: '#f9fafb',
                          borderRadius: 1,
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <ListItemText
                          primary={header.key}
                          secondary={header.value}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            fontFamily: 'monospace',
                          }}
                          secondaryTypographyProps={{
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                          }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => handleDeleteHeader(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            {/* Body Tab */}
            {currentTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Request Body
                </Typography>

                <TextField
                  name="body"
                  label="Body Content"
                  value={apiConfig.body}
                  onChange={handleConfigChange}
                  fullWidth
                  multiline
                  rows={12}
                  placeholder='{\n  "key": "value"\n}'
                  helperText="Enter JSON or other request body content"
                  sx={{
                    '& textarea': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </Box>
            )}
          </Box>
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
            disabled={!apiConfig.url || !apiConfig.method}
          >
            Save API Config
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default APIConfigDrawer;
