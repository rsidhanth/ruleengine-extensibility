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
} from '@mui/material';
import CustomAuthConfigDialog from './CustomAuthConfigDialog';
import { getBackendOrigin } from '../services/api';

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
    oauth2_token_header: 'Authorization',
    oauth2_token_prefix: 'Bearer',
  });
  const [error, setError] = useState('');

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
        oauth2_token_header: 'Authorization',
        oauth2_token_prefix: 'Bearer',
      });
    }
    setError('');
    // Reset custom auth state
    setCustomAuthConfigs([]);
  }, [credential, open]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required OAuth2 fields
    if (formData.auth_type === 'oauth2') {
      if (!formData.oauth2_client_id || !formData.oauth2_client_secret ||
          !formData.oauth2_auth_url || !formData.oauth2_token_url) {
        setError('Please fill in all required OAuth2 fields');
        return;
      }
    }

    try {
      await onSave(formData);
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
            {/* Redirect URI - Show first so users can register it in their OAuth provider */}
            <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Step 1: Register this Redirect URI in your OAuth provider
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'grey.100',
                  p: 1,
                  borderRadius: 1,
                  wordBreak: 'break-all',
                  mb: 1
                }}
              >
                {getBackendOrigin()}/api/oauth2/callback/
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Copy this URL and add it as an authorized redirect URI in your OAuth provider's app settings
                (e.g., Google Cloud Console, Salesforce Connected App, etc.) before proceeding.
              </Typography>
            </Alert>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Step 2: Enter your OAuth2 credentials
            </Typography>

            <TextField
              name="oauth2_client_id"
              label="Client ID"
              value={formData.oauth2_client_id}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="Client ID from your OAuth provider"
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
              helperText="Client Secret from your OAuth provider"
            />
            <TextField
              name="oauth2_auth_url"
              label="Authorization URL"
              value={formData.oauth2_auth_url}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="e.g., https://accounts.google.com/o/oauth2/v2/auth"
            />
            <TextField
              name="oauth2_token_url"
              label="Token URL"
              value={formData.oauth2_token_url}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="e.g., https://oauth2.googleapis.com/token"
            />
            <TextField
              name="oauth2_scope"
              label="Scope"
              value={formData.oauth2_scope}
              onChange={handleChange}
              fullWidth
              margin="normal"
              helperText="Space-separated scopes (e.g., 'openid profile email')"
            />

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Step 3: Configure how the access token will be sent
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                name="oauth2_token_header"
                label="Token Header Name"
                value={formData.oauth2_token_header}
                onChange={handleChange}
                margin="normal"
                sx={{ flex: 1 }}
                helperText="Header name (usually 'Authorization')"
              />
              <TextField
                name="oauth2_token_prefix"
                label="Token Prefix"
                value={formData.oauth2_token_prefix}
                onChange={handleChange}
                margin="normal"
                sx={{ flex: 1 }}
                helperText="e.g., 'Bearer', 'Zoho-oauthtoken'"
              />
            </Box>

            {/* Header Preview */}
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Header Preview
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'grey.100',
                  p: 1,
                  borderRadius: 1,
                  wordBreak: 'break-all'
                }}
              >
                {formData.oauth2_token_header || 'Authorization'}: {formData.oauth2_token_prefix || 'Bearer'} {'<access_token>'}
              </Typography>
            </Alert>

            {/* Info about Authorization Code Flow */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> This profile uses OAuth2 Authorization Code flow.
                Actual authorization will happen when you create a Credential Set - users will be
                redirected to the provider's login page to authorize access.
              </Typography>
            </Alert>
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