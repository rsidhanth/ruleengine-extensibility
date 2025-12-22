import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const VariableCreateModal = ({ open, onClose, onSave, variable = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'single',
    defaultValue: '',
    description: '',
  });
  const [error, setError] = useState('');

  console.log('VariableCreateModal rendered, open:', open);

  useEffect(() => {
    if (variable) {
      setFormData({
        name: variable.name || '',
        type: variable.type || 'single',
        defaultValue: variable.defaultValue || '',
        description: variable.description || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'single',
        defaultValue: '',
        description: '',
      });
    }
    setError('');
  }, [variable, open]);

  const validateVariableName = (name) => {
    // Must start with letter, contain only alphanumeric and underscore
    const regex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return regex.test(name);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Variable name is required');
      return;
    }

    if (!validateVariableName(formData.name)) {
      setError('Variable name must start with a letter and contain only letters, numbers, and underscores');
      return;
    }

    const variableData = {
      id: variable?.id || `var_${Date.now()}`,
      name: formData.name.trim(),
      type: formData.type,
      defaultValue: formData.defaultValue.trim() || null,
      description: formData.description.trim(),
    };

    onSave(variableData);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 10000 }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {variable ? 'Edit Variable' : 'Create Variable'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, color: '#374151' }}>
              Variable Name *
            </Typography>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Systems, ProcessedCount"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#6b7280' }}>
              Must start with a letter and contain only letters, numbers, and underscores
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, color: '#374151' }}>
              Variable Type *
            </Typography>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="single">Single Value - Stores a single value</option>
              <option value="array">Array - Stores a list of values</option>
            </select>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#6b7280' }}>
              Choose whether this variable stores a single value or an array
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, color: '#374151' }}>
              Default Value (Optional)
            </Typography>
            <textarea
              name="defaultValue"
              value={formData.defaultValue}
              onChange={handleChange}
              placeholder="Leave blank to set dynamically in sequence"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#6b7280' }}>
              Initial value for this variable. Can be left blank and set during sequence execution
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600, color: '#374151' }}>
              Description (Optional)
            </Typography>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what this variable is used for"
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {variable ? 'Update Variable' : 'Create Variable'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default VariableCreateModal;
