import React, { useState } from 'react';
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import VariableCreateModal from './VariableCreateModal';

const VariableListModal = ({ open, onClose, variables = [], onSave }) => {
  const [editingVariable, setEditingVariable] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleEdit = (variable) => {
    setEditingVariable(variable);
    setShowCreateModal(true);
  };

  const handleDelete = (variableId) => {
    setDeleteConfirm(variableId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      const updatedVariables = variables.filter((v) => v.id !== deleteConfirm);
      onSave(updatedVariables);
      setDeleteConfirm(null);
    }
  };

  const handleCreateNew = () => {
    setEditingVariable(null);
    setShowCreateModal(true);
  };

  const handleVariableSave = (variableData) => {
    let updatedVariables;
    if (editingVariable) {
      // Update existing variable
      updatedVariables = variables.map((v) =>
        v.id === variableData.id ? variableData : v
      );
    } else {
      // Add new variable
      updatedVariables = [...variables, variableData];
    }
    onSave(updatedVariables);
    setShowCreateModal(false);
    setEditingVariable(null);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setEditingVariable(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 10000 }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Sequence Variables
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                size="small"
              >
                Create Variable
              </Button>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {variables.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <Typography variant="body1" sx={{ color: '#6b7280', mb: 2 }}>
                No variables created yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Click "Create Variable" to add your first variable
              </Typography>
            </Box>
          ) : (
            <>
              {deleteConfirm && (
                <Alert
                  severity="warning"
                  action={
                    <Box>
                      <Button color="inherit" size="small" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                      </Button>
                      <Button color="error" size="small" onClick={confirmDelete} sx={{ ml: 1 }}>
                        Delete
                      </Button>
                    </Box>
                  }
                  sx={{ mb: 2 }}
                >
                  Are you sure you want to delete this variable?
                </Alert>
              )}

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Variable Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Default Value</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', width: 100 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {variables.map((variable) => (
                      <TableRow
                        key={variable.id}
                        sx={{
                          '&:hover': { backgroundColor: '#f9fafb' },
                          opacity: deleteConfirm === variable.id ? 0.5 : 1,
                        }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 500, color: '#111827' }}
                          >
                            {variable.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={variable.type === 'single' ? 'Single' : 'Array'}
                            size="small"
                            sx={{
                              backgroundColor: variable.type === 'single' ? '#dbeafe' : '#fef3c7',
                              color: variable.type === 'single' ? '#1e40af' : '#92400e',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: '22px',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: variable.defaultValue ? '#374151' : '#9ca3af',
                              fontStyle: variable.defaultValue ? 'normal' : 'italic',
                              fontSize: '0.85rem',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {variable.defaultValue || 'None'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: variable.description ? '#374151' : '#9ca3af',
                              fontStyle: variable.description ? 'normal' : 'italic',
                              fontSize: '0.85rem',
                              maxWidth: 250,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {variable.description || 'No description'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(variable)}
                              disabled={deleteConfirm === variable.id}
                              sx={{ color: '#3b82f6' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(variable.id)}
                              disabled={deleteConfirm !== null}
                              sx={{ color: '#ef4444' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <VariableCreateModal
        open={showCreateModal}
        onClose={handleCreateModalClose}
        onSave={handleVariableSave}
        variable={editingVariable}
      />
    </>
  );
};

export default VariableListModal;
