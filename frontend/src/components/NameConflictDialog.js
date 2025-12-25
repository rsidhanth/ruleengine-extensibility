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
} from '@mui/material';

const NameConflictDialog = ({ open, onClose, onConfirm, conflictData }) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    onConfirm(newName.trim());
    handleClose();
  };

  const handleClose = () => {
    setNewName('');
    setError('');
    onClose();
  };

  if (!conflictData) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Name Conflict</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {conflictData.message}
        </Alert>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Please enter a new name to resolve the conflict:
        </Typography>

        <TextField
          fullWidth
          label="New Name"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error}
          placeholder={conflictData.original_name || ''}
          autoFocus
        />
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

export default NameConflictDialog;
