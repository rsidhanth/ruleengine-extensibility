import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { credentialsApi, credentialSetsApi } from '../services/api';

const CredentialSetForm = ({ open, onClose, credential, editingSet = null, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiredFields, setRequiredFields] = useState({});
  const [configuration, setConfiguration] = useState({});
  const [showPasswords, setShowPasswords] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    is_default: false,
    credential_values: {},
  });

  useEffect(() => {
    if (open && credential) {
      loadRequiredFields();
    }
  }, [open, credential]);

  useEffect(() => {
    if (editingSet) {
      setFormData({
        name: editingSet.name || '',
        is_default: editingSet.is_default || false,
        credential_values: {}, // Don't show existing values for security
      });
    } else {
      // For new credential sets, pre-populate from profile defaults
      const defaultValues = {};

      // For oauth2_client_credentials, pre-populate client_id/secret from profile
      if (credential?.auth_type === 'oauth2_client_credentials') {
        if (credential.oauth2_client_id) {
          defaultValues.client_id = credential.oauth2_client_id;
        }
        if (credential.oauth2_client_secret) {
          defaultValues.client_secret = credential.oauth2_client_secret;
        }
      }

      setFormData({
        name: '',
        is_default: false,
        credential_values: defaultValues,
      });
    }
  }, [editingSet, open, credential]);

  const loadRequiredFields = async () => {
    try {
      const response = await credentialsApi.getRequiredFields(credential.id);
      setRequiredFields(response.data.required_fields || {});
      setConfiguration(response.data.configuration || {});
    } catch (err) {
      console.error('Error loading required fields:', err);
      setError('Failed to load credential requirements');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCredentialValueChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      credential_values: {
        ...prev.credential_values,
        [fieldName]: value
      }
    }));
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all required fields are filled
    const missingFields = Object.entries(requiredFields)
      .filter(([fieldName, fieldConfig]) =>
        fieldConfig.required && !formData.credential_values[fieldName]
      )
      .map(([fieldName]) => fieldName);

    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        credential: credential.id,
      };

      if (editingSet) {
        await credentialSetsApi.update(editingSet.id, payload);
      } else {
        await credentialSetsApi.create(payload);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving credential set:', err);
      setError(err.response?.data?.detail || 'Failed to save credential set');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth2Authorize = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a name for this credential set');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current page URL to redirect back after authorization
      const redirectUrl = window.location.origin + window.location.pathname;

      const response = await credentialsApi.oauth2Initiate(credential.id, {
        set_name: formData.name,
        is_default: formData.is_default,
        redirect_url: redirectUrl,
      });

      // Redirect to the authorization URL
      window.location.href = response.data.authorization_url;
    } catch (err) {
      console.error('Error initiating OAuth2:', err);
      setError(err.response?.data?.error || 'Failed to initiate authorization');
      setLoading(false);
    }
  };

  const isOAuth2AuthCode = configuration.auth_type === 'oauth2';
  const isOAuth2ClientCredentials = configuration.auth_type === 'oauth2_client_credentials';

  const renderFieldInput = (fieldName, fieldConfig) => {
    const isPasswordType = fieldConfig.type === 'password';
    const showPassword = showPasswords[fieldName];

    return (
      <TextField
        key={fieldName}
        fullWidth
        required={fieldConfig.required}
        label={fieldConfig.label}
        type={isPasswordType && !showPassword ? 'password' : 'text'}
        value={formData.credential_values[fieldName] || ''}
        onChange={(e) => handleCredentialValueChange(fieldName, e.target.value)}
        margin="normal"
        InputProps={isPasswordType ? {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => togglePasswordVisibility(fieldName)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        } : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingSet ? 'Edit Credential Set' : 'Create Credential Set'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Profile: {credential?.name} ({credential?.auth_type})
          </Typography>

          {/* Configuration display */}
          {configuration.auth_type === 'api_key' && configuration.api_key_header && (
            <Alert severity="info" sx={{ mb: 2 }}>
              API Key will be sent in the <strong>{configuration.api_key_header}</strong> header
            </Alert>
          )}

          {isOAuth2AuthCode && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                OAuth2 Authorization Code Flow
              </Typography>
              <Typography variant="body2">• Auth URL: {configuration.auth_url}</Typography>
              <Typography variant="body2">• Token URL: {configuration.token_url}</Typography>
              {configuration.scope && <Typography variant="body2">• Scope: {configuration.scope}</Typography>}
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" color="text.secondary">Token will be sent as:</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'grey.100',
                    p: 0.5,
                    borderRadius: 1,
                    mt: 0.5
                  }}
                >
                  {configuration.token_header || 'Authorization'}: {configuration.token_prefix || 'Bearer'} {'<access_token>'}
                </Typography>
              </Box>
            </Alert>
          )}

          {isOAuth2ClientCredentials && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                OAuth2 Client Credentials Flow
              </Typography>
              <Typography variant="body2">• Token URL: {configuration.token_url}</Typography>
              {configuration.scope && <Typography variant="body2">• Scope: {configuration.scope}</Typography>}
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="caption" color="text.secondary">Token will be sent as:</Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'grey.100',
                    p: 0.5,
                    borderRadius: 1,
                    mt: 0.5
                  }}
                >
                  {configuration.token_header || 'Authorization'}: {configuration.token_prefix || 'Bearer'} {'<access_token>'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Access token will be fetched automatically when the credential is used.
                {credential?.oauth2_client_id && ' Client credentials are pre-populated from the profile.'}
              </Typography>
            </Alert>
          )}

          <TextField
            fullWidth
            required
            label="Credential Set Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            margin="normal"
            helperText="E.g., 'Production', 'Staging', 'Testing'"
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_default}
                onChange={(e) => handleChange('is_default', e.target.checked)}
              />
            }
            label="Set as default"
          />

          {/* Show different UI based on auth type */}
          {isOAuth2AuthCode ? (
            // OAuth2 Authorization Code Flow - redirect to provider
            <Box sx={{ mt: 3, mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                This credential uses OAuth2 authorization. Click the button below to authorize
                with the third-party service. You will be redirected to their login page.
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                After authorization, you will be redirected back and your credential set will be created automatically.
              </Typography>
            </Box>
          ) : isOAuth2ClientCredentials ? (
            // OAuth2 Client Credentials Flow - enter client_id and client_secret
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Client Credentials
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the client credentials from your OAuth provider. The access token will be fetched automatically.
              </Typography>

              {Object.entries(requiredFields).map(([fieldName, fieldConfig]) =>
                renderFieldInput(fieldName, fieldConfig)
              )}
            </Box>
          ) : (
            // Standard credential value input
            <Box sx={{ mt: 3, mb: 2 }}>
              {Object.keys(requiredFields).length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Credential Values
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enter the secret values for this credential set
                  </Typography>

                  {Object.entries(requiredFields).map(([fieldName, fieldConfig]) =>
                    renderFieldInput(fieldName, fieldConfig)
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {isOAuth2AuthCode ? (
            // OAuth2 Authorization Code Flow - Authorize button
            <Button
              variant="contained"
              color="primary"
              disabled={loading || !formData.name.trim()}
              onClick={handleOAuth2Authorize}
              startIcon={loading ? <CircularProgress size={20} /> : <OpenInNewIcon />}
            >
              Authorize
            </Button>
          ) : (
            // Standard submit button (for client_credentials and other types)
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {editingSet ? 'Update' : 'Create'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CredentialSetForm;
