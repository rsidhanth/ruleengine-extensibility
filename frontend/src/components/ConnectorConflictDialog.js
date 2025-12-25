import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Box,
  Divider,
} from '@mui/material';

const ConnectorConflictDialog = ({ open, onClose, onConfirm, conflictData }) => {
  const [connectorName, setConnectorName] = useState('');
  const [credentialOption, setCredentialOption] = useState('use_existing');
  const [credentialName, setCredentialName] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const resolution = {};

    // Handle connector name conflict
    if (conflictData?.conflict_type === 'connector') {
      if (!connectorName.trim()) {
        setError('Connector name cannot be empty');
        return;
      }
      resolution.connector_name_override = connectorName.trim();
    }

    // Handle credential profile conflict
    if (conflictData?.conflict_type === 'credential') {
      if (credentialOption === 'use_existing') {
        resolution.use_existing_credential = true;
      } else if (credentialOption === 'rename') {
        if (!credentialName.trim()) {
          setError('Credential profile name cannot be empty');
          return;
        }
        resolution.credential_name_override = credentialName.trim();
        resolution.use_existing_credential = false;
      }
    }

    onConfirm(resolution);
    handleClose();
  };

  const handleClose = () => {
    setConnectorName('');
    setCredentialOption('use_existing');
    setCredentialName('');
    setError('');
    onClose();
  };

  if (!conflictData) return null;

  const isConnectorConflict = conflictData.conflict_type === 'connector';
  const isCredentialConflict = conflictData.conflict_type === 'credential';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isConnectorConflict ? 'Connector Name Conflict' : 'Credential Profile Conflict'}
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {conflictData.message}
        </Alert>

        {isConnectorConflict && (
          <Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Please enter a new connector name to resolve the conflict:
            </Typography>
            <TextField
              fullWidth
              label="New Connector Name"
              value={connectorName}
              onChange={(e) => {
                setConnectorName(e.target.value);
                setError('');
              }}
              error={!!error}
              helperText={error}
              placeholder={conflictData.original_name || ''}
              autoFocus
            />
          </Box>
        )}

        {isCredentialConflict && (
          <Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              A credential profile with the name "{conflictData.original_credential_name}" already exists.
            </Typography>

            {conflictData.existing_credential && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Existing Credential Profile:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Name: {conflictData.existing_credential.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Auth Type: {conflictData.existing_credential.auth_type}
                </Typography>
                {conflictData.existing_credential.description && (
                  <Typography variant="body2" color="textSecondary">
                    Description: {conflictData.existing_credential.description}
                  </Typography>
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <FormControl component="fieldset" fullWidth>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Choose how to resolve this conflict:
              </Typography>
              <RadioGroup
                value={credentialOption}
                onChange={(e) => {
                  setCredentialOption(e.target.value);
                  setError('');
                }}
              >
                <FormControlLabel
                  value="use_existing"
                  control={<Radio />}
                  label="Use the existing credential profile"
                />
                <FormControlLabel
                  value="rename"
                  control={<Radio />}
                  label="Rename the imported credential profile"
                />
              </RadioGroup>
            </FormControl>

            {credentialOption === 'rename' && (
              <TextField
                fullWidth
                label="New Credential Profile Name"
                value={credentialName}
                onChange={(e) => {
                  setCredentialName(e.target.value);
                  setError('');
                }}
                error={!!error}
                helperText={error}
                placeholder={conflictData.original_credential_name || ''}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectorConflictDialog;
