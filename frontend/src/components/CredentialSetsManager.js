import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { credentialSetsApi } from '../services/api';
import CredentialSetForm from './CredentialSetForm';

const CredentialSetsManager = ({ open, onClose, credential }) => {
  const [credentialSets, setCredentialSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSet, setEditingSet] = useState(null);

  useEffect(() => {
    if (open && credential) {
      loadCredentialSets();
    }
  }, [open, credential]);

  const loadCredentialSets = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await credentialSetsApi.getAll({ credential: credential.id });
      setCredentialSets(response.data);
    } catch (err) {
      console.error('Error loading credential sets:', err);
      setError('Failed to load credential sets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSet(null);
    setShowForm(true);
  };

  const handleEdit = (set) => {
    setEditingSet(set);
    setShowForm(true);
  };

  const handleDelete = async (setId) => {
    if (!window.confirm('Are you sure you want to delete this credential set?')) {
      return;
    }

    try {
      await credentialSetsApi.delete(setId);
      loadCredentialSets();
    } catch (err) {
      console.error('Error deleting credential set:', err);
      setError('Failed to delete credential set');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSet(null);
  };

  const handleFormSave = () => {
    loadCredentialSets();
    handleFormClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Credential Sets for {credential?.name}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              size="small"
            >
              New Set
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {credential && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Profile Type:</strong> {credential.auth_type}
              {credential.credential_type === 'system' && ' (System Profile)'}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : credentialSets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No credential sets yet. Create one to get started.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Default</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credentialSets.map((set) => (
                    <TableRow key={set.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {set.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {set.is_default ? (
                          <Chip
                            icon={<StarIcon />}
                            label="Default"
                            size="small"
                            color="primary"
                          />
                        ) : (
                          <StarBorderIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {set.created_by_email || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(set.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(set)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(set.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {showForm && (
        <CredentialSetForm
          open={showForm}
          onClose={handleFormClose}
          credential={credential}
          editingSet={editingSet}
          onSave={handleFormSave}
        />
      )}
    </>
  );
};

export default CredentialSetsManager;
