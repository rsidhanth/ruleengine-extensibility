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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  ContentCopy as DuplicateIcon,
  PlayArrow as TestIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
} from '@mui/icons-material';
import { eventsApi } from '../services/api';
import EventForm from '../components/EventForm';
import EventTestModal from '../components/EventTestModal';
import ImportModal from '../components/ImportModal';
import NameConflictDialog from '../components/NameConflictDialog';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingEvent, setTestingEvent] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [nameConflictData, setNameConflictData] = useState(null);
  const [importDataCache, setImportDataCache] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await eventsApi.getAll();
      setEvents(response.data);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setShowForm(true);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setShowForm(true);
  };

  const handleView = (event) => {
    // For now, just open in edit mode with readonly option
    setSelectedEvent(event);
    setShowForm(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedEvent) {
        await eventsApi.update(selectedEvent.id, data);
      } else {
        await eventsApi.create(data);
      }
      setShowForm(false);
      loadEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id);
        loadEvents();
      } catch (err) {
        setError('Failed to delete event');
        console.error('Error deleting event:', err);
      }
    }
  };

  const handleCopyEndpoint = (endpoint) => {
    const fullUrl = `${window.location.origin}${endpoint}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setSnackbar({ open: true, message: 'Endpoint copied to clipboard!' });
    }).catch((err) => {
      console.error('Failed to copy:', err);
      setSnackbar({ open: true, message: 'Failed to copy endpoint' });
    });
  };

  const handleTest = (event) => {
    setTestingEvent(event);
    setTestModalOpen(true);
  };

  const handleDownloadPayload = async (event) => {
    try {
      // Fetch the sample payload from the API
      const response = await eventsApi.getSamplePayload(event.id);
      const samplePayload = response.data.sample_payload || {};

      // Download the sample payload (not the schema)
      const dataStr = JSON.stringify(samplePayload, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sample_payload.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Sample payload downloaded successfully!' });
    } catch (err) {
      console.error('Failed to download payload:', err);
      setSnackbar({ open: true, message: 'Failed to download sample payload' });
    }
  };

  const handleStatusToggle = async (event) => {
    try {
      await eventsApi.toggleStatus(event.id);
      loadEvents();
      const newStatus = event.status === 'active' ? 'inactive' : 'active';
      setSnackbar({ open: true, message: `Event ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!` });
    } catch (err) {
      setError('Failed to update event status');
      console.error('Error updating event status:', err);
    }
  };

  const handleDuplicate = async (event) => {
    try {
      const duplicatedData = {
        name: `${event.name} (Copy)`,
        description: event.description,
        event_type: 'custom',
        event_format: event.event_format,
        parameters: event.parameters,
        acknowledgement_enabled: event.acknowledgement_enabled,
        acknowledgement_type: event.acknowledgement_type,
        acknowledgement_status_code: event.acknowledgement_status_code,
        acknowledgement_payload: event.acknowledgement_payload,
        status: event.status,
      };
      await eventsApi.create(duplicatedData);
      loadEvents();
      setSnackbar({ open: true, message: 'Event duplicated successfully!' });
    } catch (err) {
      setError('Failed to duplicate event');
      console.error('Error duplicating event:', err);
    }
  };

  const getEventTypeColor = (type) => {
    return type === 'system' ? 'secondary' : 'primary';
  };

  const getEventTypeLabel = (type) => {
    return type === 'system' ? 'System' : 'Custom';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'default';
  };

  const getStatusLabel = (status) => {
    return status === 'active' ? 'Active' : 'Inactive';
  };

  const handleExport = async (event) => {
    try {
      const response = await eventsApi.export(event.id);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${event.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Event exported successfully' });
    } catch (err) {
      setError('Failed to export event');
    }
  };

  const handleImport = async (file, overrides = {}) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      setImportDataCache(importData);

      const requestData = {
        ...importData,
        ...overrides
      };

      const response = await eventsApi.import(requestData);

      if (response.data.success) {
        setSnackbar({ open: true, message: 'Event imported successfully' });
        loadEvents();
        setImportDataCache(null);
        setImportModalOpen(false);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;

      if (errorType === 'name_conflict') {
        setNameConflictData({
          data: err.response.data,
          originalData: importDataCache || JSON.parse(await file.text())
        });
        setImportModalOpen(false);
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    }
  };

  const handleConflictResolve = async (newName) => {
    try {
      const requestData = {
        ...importDataCache,
        name_override: newName
      };

      const response = await eventsApi.import(requestData);

      if (response.data.success) {
        setSnackbar({ open: true, message: 'Event imported successfully' });
        loadEvents();
        setImportDataCache(null);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;
      if (errorType === 'name_conflict') {
        setNameConflictData({
          data: err.response.data,
          originalData: importDataCache
        });
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    } finally {
      setNameConflictData(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Events
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportModalOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Create Event
          </Button>
        </Box>
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
              <TableCell><strong>Event Name</strong></TableCell>
              <TableCell><strong>Event ID</strong></TableCell>
              <TableCell><strong>Event Type</strong></TableCell>
              <TableCell><strong>Event Status</strong></TableCell>
              <TableCell><strong>Event Endpoint</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No events found. Create your first event to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {event.name}
                    </Typography>
                    {event.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {event.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                      >
                        {event.event_id}
                      </Typography>
                      <Chip
                        label={`v${event.version || 1}`}
                        size="small"
                        sx={{
                          height: '18px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getEventTypeLabel(event.event_type)}
                      color={getEventTypeColor(event.event_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={getStatusLabel(event.status)}
                        color={getStatusColor(event.status)}
                        size="small"
                      />
                      <Switch
                        checked={event.status === 'active'}
                        onChange={() => handleStatusToggle(event)}
                        size="small"
                        color="success"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          backgroundColor: '#f5f5f5',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          maxWidth: '400px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.webhook_endpoint}
                      </Typography>
                      <Tooltip title="Copy endpoint URL">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyEndpoint(event.webhook_endpoint)}
                          sx={{
                            padding: '4px',
                            '&:hover': {
                              backgroundColor: 'primary.light',
                              color: 'white',
                            }
                          }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Export event">
                      <IconButton
                        size="small"
                        onClick={() => handleExport(event)}
                        color="info"
                      >
                        <ExportIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View event">
                      <IconButton
                        size="small"
                        onClick={() => handleView(event)}
                        color="info"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate event">
                      <IconButton
                        size="small"
                        onClick={() => handleDuplicate(event)}
                        color="secondary"
                      >
                        <DuplicateIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download payload format">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadPayload(event)}
                        color="success"
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test event">
                      <IconButton
                        size="small"
                        onClick={() => handleTest(event)}
                        color="success"
                      >
                        <TestIcon />
                      </IconButton>
                    </Tooltip>
                    {event.event_type === 'custom' && (
                      <>
                        <Tooltip title="Edit event">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(event)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete event">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(event.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        event={selectedEvent}
      />

      <EventTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        event={testingEvent}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportDataCache(null);
        }}
        onImport={handleImport}
        title="Import Event"
      />

      <NameConflictDialog
        open={!!nameConflictData}
        onClose={() => {
          setNameConflictData(null);
          setImportDataCache(null);
        }}
        onConfirm={handleConflictResolve}
        conflictData={nameConflictData?.data}
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

export default Events;
