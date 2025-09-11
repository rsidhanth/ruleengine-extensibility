import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as RunIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Rule as RuleIcon,
} from '@mui/icons-material';
import { workflowsApi } from '../services/api';
import WorkflowForm from '../components/WorkflowForm';
import WorkflowRulesDialog from '../components/WorkflowRulesDialog';
import WorkflowExecutionDialog from '../components/WorkflowExecutionDialog';

const Workflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await workflowsApi.getAll();
      setWorkflows(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleWorkflows = async () => {
    try {
      await workflowsApi.createSampleWorkflows();
      loadWorkflows();
    } catch (err) {
      setError('Failed to create sample workflows');
    }
  };

  const handleAddWorkflow = () => {
    setSelectedWorkflow(null);
    setShowWorkflowForm(true);
  };

  const handleEditWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setShowWorkflowForm(true);
  };

  const handleViewWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    // Could open a view-only dialog
    alert(`Viewing workflow: ${workflow.name}`);
  };

  const handleRunWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setShowExecutionDialog(true);
  };

  const handleManageRules = (workflow) => {
    setSelectedWorkflow(workflow);
    setShowRulesDialog(true);
  };

  const handleDeleteWorkflow = (workflow) => {
    setConfirmDelete(workflow);
  };

  const confirmDeleteWorkflow = async () => {
    if (confirmDelete) {
      try {
        await workflowsApi.delete(confirmDelete.id);
        setConfirmDelete(null);
        loadWorkflows();
      } catch (err) {
        setError('Failed to delete workflow');
      }
    }
  };

  const handleSaveWorkflow = async (workflowData) => {
    try {
      if (selectedWorkflow) {
        await workflowsApi.update(selectedWorkflow.id, workflowData);
      } else {
        await workflowsApi.create(workflowData);
      }
      setShowWorkflowForm(false);
      loadWorkflows();
    } catch (err) {
      throw new Error('Failed to save workflow');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workflows
        </Typography>
        <Box>
          {workflows.length === 0 && (
            <Button
              variant="outlined"
              onClick={handleCreateSampleWorkflows}
              sx={{ mr: 2 }}
            >
              Create Sample Workflows
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddWorkflow}
          >
            New Workflow
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {workflows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No workflows found
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Get started by creating your first workflow or loading sample workflows.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Rules</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{workflow.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {workflow.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={`${workflow.rules_count || 0} rules`}
                      color={workflow.rules_count > 0 ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={workflow.is_active ? 'Active' : 'Inactive'}
                      color={workflow.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(workflow.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewWorkflow(workflow)}
                      title="View"
                      color="info"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRunWorkflow(workflow)}
                      title="Run"
                      color="success"
                    >
                      <RunIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditWorkflow(workflow)}
                      title="Edit"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleManageRules(workflow)}
                      title="Manage Rules"
                      color="warning"
                    >
                      <RuleIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteWorkflow(workflow)}
                      title="Delete"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Workflow Form Dialog */}
      <WorkflowForm
        open={showWorkflowForm}
        onClose={() => setShowWorkflowForm(false)}
        onSave={handleSaveWorkflow}
        workflow={selectedWorkflow}
      />

      {/* Workflow Rules Dialog */}
      <WorkflowRulesDialog
        open={showRulesDialog}
        onClose={() => setShowRulesDialog(false)}
        workflow={selectedWorkflow}
      />

      {/* Workflow Execution Dialog */}
      <WorkflowExecutionDialog
        open={showExecutionDialog}
        onClose={() => setShowExecutionDialog(false)}
        workflow={selectedWorkflow}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the workflow "{confirmDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={confirmDeleteWorkflow} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Workflows;