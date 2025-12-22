import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Snackbar,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as DuplicateIcon,
  PlayArrow as ExecuteIcon,
  BugReport as TestIcon,
} from '@mui/icons-material';
import { sequencesApi } from '../services/api';
import SequenceForm from '../components/SequenceForm';
import SequenceBuilder from '../components/SequenceBuilder';
import SequenceTypeSelector from '../components/SequenceTypeSelector';
import TemplateSelector from '../components/TemplateSelector';
import SequenceTestModal from '../components/SequenceTestModal';

const Sequences = () => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderData, setBuilderData] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingSequence, setTestingSequence] = useState(null);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await sequencesApi.getAll();
      setSequences(response.data);
    } catch (err) {
      setError('Failed to load sequences');
      console.error('Error loading sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedSequence(null);
    setSelectedTemplate(null);
    setShowTypeSelector(true);
  };

  const handleTypeSelect = (type) => {
    setShowTypeSelector(false);
    if (type === 'template') {
      setShowTemplateSelector(true);
    } else {
      setShowForm(true);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowForm(true);
  };

  const handleEdit = (sequence) => {
    // Directly open the builder with the sequence data
    setBuilderData(sequence);
    setShowBuilder(true);
  };

  const handleView = (sequence) => {
    // View also opens the builder (in read-only mode if needed)
    setBuilderData(sequence);
    setShowBuilder(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedSequence) {
        await sequencesApi.update(selectedSequence.id, data);
      } else {
        await sequencesApi.create(data);
      }
      setShowForm(false);
      loadSequences();
    } catch (err) {
      console.error('Error saving sequence:', err);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sequence?')) {
      try {
        await sequencesApi.delete(id);
        loadSequences();
      } catch (err) {
        setError('Failed to delete sequence');
        console.error('Error deleting sequence:', err);
      }
    }
  };

  const handleDuplicate = async (sequence) => {
    try {
      const duplicatedData = {
        name: `${sequence.name} (Copy)`,
        description: sequence.description,
        sequence_type: 'custom',
        status: sequence.status,
      };
      await sequencesApi.create(duplicatedData);
      loadSequences();
      setSnackbar({ open: true, message: 'Sequence duplicated successfully!' });
    } catch (err) {
      setError('Failed to duplicate sequence');
      console.error('Error duplicating sequence:', err);
    }
  };

  const handleOpenBuilder = (sequenceData) => {
    // If a template was selected, include template data
    const builderPayload = selectedTemplate
      ? { ...sequenceData, template: selectedTemplate }
      : sequenceData;
    setBuilderData(builderPayload);
    setShowBuilder(true);
  };

  const handleBuilderSave = (workflowData) => {
    // SequenceBuilder already handles the API save, we just need to update UI
    setShowBuilder(false);
    setBuilderData(null);
    loadSequences();
    setSnackbar({
      open: true,
      message: workflowData.id ? 'Sequence updated successfully!' : 'Sequence created successfully!'
    });
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setBuilderData(null);
  };

  const handleToggleStatus = async (sequence) => {
    try {
      await sequencesApi.toggleStatus(sequence.id);
      loadSequences();
      const newStatus = sequence.status === 'active' ? 'inactive' : 'active';
      setSnackbar({
        open: true,
        message: `Sequence ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`,
      });
    } catch (err) {
      setError('Failed to toggle sequence status');
      console.error('Error toggling sequence status:', err);
    }
  };

  const handleTest = (sequence) => {
    console.log('Sequences.js - handleTest called with sequence:', sequence);
    console.log('Sequences.js - sequence.id:', sequence.id);
    console.log('Sequences.js - sequence.sequence_id:', sequence.sequence_id);
    setTestingSequence(sequence);
    setTestModalOpen(true);
  };

  const handleExecute = async (sequence) => {
    if (sequence.status !== 'active') {
      setSnackbar({
        open: true,
        message: 'Sequence must be active to execute',
      });
      return;
    }

    try {
      const result = await sequencesApi.execute(sequence.id, {
        test: true,
        timestamp: new Date().toISOString(),
      });

      if (result.data.success) {
        setSnackbar({
          open: true,
          message: `Sequence executed successfully! Execution ID: ${result.data.execution_id}`,
        });
      } else {
        setSnackbar({
          open: true,
          message: `Execution failed: ${result.data.error}`,
        });
      }
    } catch (err) {
      setError('Failed to execute sequence');
      console.error('Error executing sequence:', err);
      setSnackbar({
        open: true,
        message: 'Failed to execute sequence',
      });
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'default';
  };

  const getStatusLabel = (status) => {
    return status === 'active' ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (showBuilder && builderData) {
    return (
      <SequenceBuilder
        sequenceData={builderData}
        onSave={handleBuilderSave}
        onClose={handleBuilderClose}
      />
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Sequences
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Create Sequence
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Sequence Name</strong></TableCell>
              <TableCell><strong>Sequence ID</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No sequences found. Create your first sequence to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sequences.map((sequence) => (
                <TableRow key={sequence.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {sequence.name}
                    </Typography>
                    {sequence.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {sequence.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                    >
                      {sequence.sequence_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={sequence.status === 'active'}
                          onChange={() => handleToggleStatus(sequence)}
                          color="success"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {getStatusLabel(sequence.status)}
                        </Typography>
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleView(sequence)}
                        color="info"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleTest(sequence)}
                        color="warning"
                      >
                        <TestIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Quick execute sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleExecute(sequence)}
                        color="success"
                        disabled={sequence.status !== 'active'}
                      >
                        <ExecuteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleDuplicate(sequence)}
                        color="secondary"
                      >
                        <DuplicateIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(sequence)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete sequence">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(sequence.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <SequenceTypeSelector
        open={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelectType={handleTypeSelect}
      />

      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      <SequenceForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        onOpenBuilder={handleOpenBuilder}
        sequence={selectedSequence}
        template={selectedTemplate}
      />

      <SequenceTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        sequence={testingSequence}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default Sequences;
