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
} from '@mui/material';
import { credentialsApi } from '../services/api';

const ConnectorForm = ({ open, onClose, onSave, connector = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_url: '',
    credential: '',
  });
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      loadCredentials();
    }
  }, [open]);

  useEffect(() => {
    if (connector) {
      setFormData({ ...connector });
    } else {
      setFormData({
        name: '',
        description: '',
        base_url: '',
        credential: '',
      });
    }
    setError('');
  }, [connector, open]);

  const loadCredentials = async () => {
    try {
      const response = await credentialsApi.getAll();
      setCredentials(response.data);
    } catch (err) {
      setError('Failed to load credentials');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save connector');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {connector ? 'Edit Connector' : 'New Connector'}
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
          
          <TextField
            name="base_url"
            label="Base URL"
            value={formData.base_url}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            helperText="e.g., https://api.example.com"
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Credential</InputLabel>
            <Select
              name="credential"
              value={formData.credential || ''}
              onChange={handleChange}
              label="Credential"
            >
              <MenuItem value="">No Credential</MenuItem>
              {credentials.map((cred) => (
                <MenuItem key={cred.id} value={cred.id}>
                  {cred.name} ({cred.auth_type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {connector ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ConnectorForm;