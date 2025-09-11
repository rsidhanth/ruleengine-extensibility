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
} from '@mui/material';
import { CheckCircle as SuccessIcon, Error as ErrorIcon } from '@mui/icons-material';
import { credentialsApi } from '../services/api';
import CustomAuthConfigDialog from './CustomAuthConfigDialog';

const CredentialForm = ({ open, onClose, onSave, credential = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    auth_type: 'none',
    username: '',
    password: '',
    api_key: '',
    api_key_header: 'X-API-Key',
    bearer_token: '',
    oauth2_client_id: '',
    oauth2_client_secret: '',
    oauth2_auth_url: '',
    oauth2_token_url: '',
    oauth2_scope: '',
  });
  const [error, setError] = useState('');
  const [oauth2Status, setOauth2Status] = useState(null); // null, 'testing', 'success', 'error'
  const [oauth2Result, setOauth2Result] = useState(null);
  const [oauth2Tokens, setOauth2Tokens] = useState(null); // Store tokens for saving
  
  // Custom auth state
  const [showCustomAuthDialog, setShowCustomAuthDialog] = useState(false);
  const [customAuthConfigs, setCustomAuthConfigs] = useState([]);

  useEffect(() => {
    if (credential) {
      setFormData({ ...credential });
    } else {
      setFormData({
        name: '',
        description: '',
        auth_type: 'none',
        username: '',
        password: '',
        api_key: '',
        api_key_header: 'X-API-Key',
        bearer_token: '',
        oauth2_client_id: '',
        oauth2_client_secret: '',
        oauth2_auth_url: '',
        oauth2_token_url: '',
        oauth2_scope: '',
      });
    }
    setError('');
    // Reset OAuth2 state
    setOauth2Status(null);
    setOauth2Result(null);
    setOauth2Tokens(null);
    
    // Reset custom auth state
    setCustomAuthConfigs([]);
  }, [credential, open]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Reset OAuth2 validation when fields change
    if (e.target.name.startsWith('oauth2_')) {
      setOauth2Status(null);
      setOauth2Result(null);
      setOauth2Tokens(null);
    }
  };

  const handleTestOAuth2 = async () => {
    // Validate required fields
    const requiredFields = ['oauth2_client_id', 'oauth2_client_secret', 'oauth2_token_url'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setOauth2Status('testing');
    setError('');
    setOauth2Result(null);

    try {
      const response = await credentialsApi.testOAuth2({
        oauth2_client_id: formData.oauth2_client_id,
        oauth2_client_secret: formData.oauth2_client_secret,
        oauth2_token_url: formData.oauth2_token_url,
        oauth2_scope: formData.oauth2_scope,
      });

      setOauth2Status('success');
      setOauth2Result(response.data);
      setOauth2Tokens(response.data._tokens); // Store tokens for saving
      
    } catch (err) {
      setOauth2Status('error');
      setOauth2Result(err.response?.data || { error: 'Test failed' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate OAuth2 credentials before saving
    if (formData.auth_type === 'oauth2' && oauth2Status !== 'success') {
      setError('Please test and validate OAuth2 credentials before saving');
      return;
    }
    
    try {
      // Include OAuth2 tokens if available
      const dataToSave = { ...formData };
      if (formData.auth_type === 'oauth2' && oauth2Tokens) {
        dataToSave.access_token = oauth2Tokens.access_token;
        dataToSave.refresh_token = oauth2Tokens.refresh_token;
        dataToSave.expires_at = oauth2Tokens.expires_at;
      }
      
      await onSave(dataToSave);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save credential');
    }
  };

  const renderAuthFields = () => {
    switch (formData.auth_type) {
      case 'basic':
        return (
          <>
            <TextField
              name="username"
              label="Username"
              value={formData.username}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          </>
        );
      case 'api_key':
        return (
          <>
            <TextField
              name="api_key_header"
              label="Header Name"
              value={formData.api_key_header}
              onChange={handleChange}
              fullWidth
              margin="normal"
              helperText="Header name for the API key (e.g., X-API-Key)"
            />
            <TextField
              name="api_key"
              label="API Key"
              type="password"
              value={formData.api_key}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          </>
        );
      case 'bearer':
        return (
          <TextField
            name="bearer_token"
            label="Bearer Token"
            type="password"
            value={formData.bearer_token}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
        );
      case 'oauth2':
        return (
          <>
            <TextField
              name="oauth2_client_id"
              label="Client ID"
              value={formData.oauth2_client_id}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              name="oauth2_client_secret"
              label="Client Secret"
              type="password"
              value={formData.oauth2_client_secret}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              name="oauth2_auth_url"
              label="Authorization URL"
              value={formData.oauth2_auth_url}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="OAuth2 authorization endpoint URL"
            />
            <TextField
              name="oauth2_token_url"
              label="Token URL"
              value={formData.oauth2_token_url}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="OAuth2 token endpoint URL"
            />
            <TextField
              name="oauth2_scope"
              label="Scope"
              value={formData.oauth2_scope}
              onChange={handleChange}
              fullWidth
              margin="normal"
              helperText="OAuth2 scope (optional, space-separated)"
            />
            
            {/* OAuth2 Validation Section */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                OAuth2 Token Validation
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                Test your OAuth2 credentials to fetch tokens. Credentials can only be saved after successful validation.
              </Typography>
              
              <Button
                onClick={handleTestOAuth2}
                variant="outlined"
                disabled={oauth2Status === 'testing' || !formData.oauth2_client_id || !formData.oauth2_client_secret || !formData.oauth2_token_url}
                startIcon={oauth2Status === 'testing' ? <CircularProgress size={16} /> : null}
                sx={{ mb: 2 }}
              >
                {oauth2Status === 'testing' ? 'Testing...' : 'Test & Validate'}
              </Button>
              
              {/* Status Display */}
              {oauth2Status === 'success' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SuccessIcon />
                    <Typography variant="body2">
                      OAuth2 tokens fetched successfully! You can now save the credential.
                    </Typography>
                  </Box>
                  {oauth2Result && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" display="block">
                        Token Type: {oauth2Result.token_type || 'Bearer'}
                      </Typography>
                      {oauth2Result.expires_in && (
                        <Typography variant="caption" display="block">
                          Expires in: {oauth2Result.expires_in} seconds
                        </Typography>
                      )}
                      {oauth2Result.scope && (
                        <Typography variant="caption" display="block">
                          Scope: {oauth2Result.scope}
                        </Typography>
                      )}
                      <Typography variant="caption" display="block">
                        Response time: {oauth2Result.response_time_ms}ms
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}
              
              {oauth2Status === 'error' && oauth2Result && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <ErrorIcon />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        OAuth2 validation failed: {oauth2Result.error}
                      </Typography>
                      
                      {/* Debug Information */}
                      {(oauth2Result.status_code || oauth2Result.error_type || oauth2Result.error_details) && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                            <strong>Debug Info:</strong>
                          </Typography>
                          {oauth2Result.status_code && (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                              Status: {oauth2Result.status_code}
                            </Typography>
                          )}
                          {oauth2Result.error_type && (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                              Type: {oauth2Result.error_type}
                            </Typography>
                          )}
                          {oauth2Result.token_url && (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                              URL: {oauth2Result.token_url}
                            </Typography>
                          )}
                          {oauth2Result.response_time_ms && (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                              Response time: {oauth2Result.response_time_ms}ms
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {/* Possible Causes */}
                      {oauth2Result.possible_causes && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            Possible causes:
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, m: 0, mt: 0.5 }}>
                            {oauth2Result.possible_causes.map((cause, index) => (
                              <Typography component="li" variant="caption" key={index}>
                                {cause}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {/* Full Error Response */}
                      {oauth2Result.response_body && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                            Server response:
                          </Typography>
                          <TextField
                            value={typeof oauth2Result.response_body === 'string' ? oauth2Result.response_body : JSON.stringify(oauth2Result.response_body, null, 2)}
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            size="small"
                            InputProps={{ readOnly: true }}
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              mt: 0.5,
                              '& .MuiInputBase-input': { fontSize: '0.75rem' }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Alert>
              )}
            </Box>
          </>
        );
      case 'custom':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Custom Authentication Configuration
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
              Configure custom authentication parameters with static values or dynamic token fetching from APIs.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Custom authentication allows you to define key-value pairs for authentication. 
                Values can be static (entered manually) or dynamic (fetched from another API in real-time).
              </Typography>
            </Alert>
            
            <Button
              variant="outlined"
              sx={{ mb: 2 }}
              onClick={() => setShowCustomAuthDialog(true)}
            >
              Configure Authentication Parameters
              {customAuthConfigs.length > 0 && (
                <Box component="span" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'primary.main', color: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                  {customAuthConfigs.length}
                </Box>
              )}
            </Button>
            
            {customAuthConfigs.length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {customAuthConfigs.length} authentication parameter{customAuthConfigs.length > 1 ? 's' : ''} configured
                </Typography>
              </Alert>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {credential ? 'Edit Credential' : 'New Credential'}
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
            <InputLabel>Authentication Type</InputLabel>
            <Select
              name="auth_type"
              value={formData.auth_type}
              onChange={handleChange}
              label="Authentication Type"
            >
              <MenuItem value="none">No Authentication</MenuItem>
              <MenuItem value="basic">Basic Authentication</MenuItem>
              <MenuItem value="api_key">API Key</MenuItem>
              <MenuItem value="bearer">Bearer Token</MenuItem>
              <MenuItem value="oauth2">OAuth 2.0</MenuItem>
              <MenuItem value="custom">Custom Authentication</MenuItem>
            </Select>
          </FormControl>
          
          {renderAuthFields()}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained"
            disabled={formData.auth_type === 'oauth2' && oauth2Status !== 'success'}
          >
            {credential ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
      
      {/* Custom Auth Configuration Dialog */}
      <CustomAuthConfigDialog
        open={showCustomAuthDialog}
        onClose={() => setShowCustomAuthDialog(false)}
        credentialId={credential?.id}
        onSave={(configs) => {
          setCustomAuthConfigs(configs);
          setShowCustomAuthDialog(false);
        }}
      />
    </Dialog>
  );
};

export default CredentialForm;