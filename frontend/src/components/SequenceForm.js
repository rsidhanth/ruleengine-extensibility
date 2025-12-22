import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  MenuItem,
  FormControlLabel,
  Switch,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Typography,
  Box,
  Checkbox,
  Paper,
} from '@mui/material';
import { eventsApi } from '../services/api';

const SequenceForm = ({ open, onClose, onSave, onOpenBuilder, sequence = null, template = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sequence_type: 'custom',
    status: 'active',
    trigger_type: 'event',
    trigger_events: [],
    trigger_event_version: 'latest',
  });
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventVersions, setEventVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open]);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await eventsApi.getAll();
      setEvents(response.data);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadEventVersions = async (eventId) => {
    setLoadingVersions(true);
    try {
      // For now, we'll create mock versions. In production, this would be an API call
      // const response = await eventsApi.getVersions(eventId);
      // setEventVersions(response.data);

      // Mock data for demonstration
      const mockVersions = [
        { version: '1.0', created_at: '2024-01-01' },
        { version: '1.1', created_at: '2024-02-01' },
        { version: '2.0', created_at: '2024-03-01' },
      ];
      setEventVersions(mockVersions);
    } catch (err) {
      console.error('Error loading event versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    if (sequence) {
      setFormData({
        name: sequence.name || '',
        description: sequence.description || '',
        sequence_type: sequence.sequence_type || 'custom',
        status: sequence.status || 'active',
        trigger_type: sequence.trigger_type || 'event',
        trigger_events: Array.isArray(sequence.trigger_events) ? sequence.trigger_events : (sequence.trigger_events ? [sequence.trigger_events] : []),
        trigger_event_version: sequence.trigger_event_version || 'latest',
      });
    } else if (template) {
      // Pre-populate with template data
      setFormData({
        name: template.name,
        description: template.description,
        sequence_type: 'custom',
        status: 'active',
        trigger_type: 'event',
        trigger_events: [],
        trigger_event_version: 'latest',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        sequence_type: 'custom',
        status: 'active',
        trigger_type: 'event',
        trigger_events: [],
        trigger_event_version: 'latest',
      });
    }
    setError('');
  }, [sequence, template, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // Load event versions when events are selected
    if (name === 'trigger_events' && Array.isArray(value) && value.length > 0) {
      loadEventVersions(value[0]); // Load versions for the first selected event
      setFormData(prev => ({ ...prev, trigger_event_version: 'latest' }));
    }
  };

  const handleStatusToggle = (e) => {
    setFormData({
      ...formData,
      status: e.target.checked ? 'active' : 'inactive',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Sequence name is required');
      return;
    }

    if (formData.trigger_type === 'event' && (!Array.isArray(formData.trigger_events) || formData.trigger_events.length === 0)) {
      setError('Please select at least one trigger event');
      return;
    }

    try {
      // If this is a new sequence, open the builder instead of saving immediately
      if (!sequence) {
        onOpenBuilder(formData);
        onClose();
      } else {
        // For editing existing sequences, just save
        await onSave(formData);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save sequence');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {sequence ? 'Edit Sequence' : 'Create New Sequence'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            name="name"
            label="Sequence Name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            helperText="A descriptive name for the sequence"
          />

          <TextField
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={3}
            helperText="Describe what this sequence does"
          />

          {!sequence && (
            <>
              <FormControl component="fieldset" sx={{ mt: 3, mb: 2 }}>
                <FormLabel component="legend">Sequence Trigger</FormLabel>
                <RadioGroup
                  name="trigger_type"
                  value={formData.trigger_type}
                  onChange={handleChange}
                >
                  <FormControlLabel
                    value="event"
                    control={<Radio />}
                    label="Trigger on Event"
                  />
                  <FormControlLabel
                    value="schedule"
                    control={<Radio />}
                    label="Trigger on Schedule"
                  />
                </RadioGroup>
              </FormControl>

              {formData.trigger_type === 'event' && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                    Select Events *
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      p: 1,
                      backgroundColor: loadingEvents ? '#f9fafb' : 'white',
                    }}
                  >
                    {loadingEvents ? (
                      <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        Loading events...
                      </Typography>
                    ) : events.length === 0 ? (
                      <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        No events available
                      </Typography>
                    ) : (
                      events.map((event) => (
                        <FormControlLabel
                          key={event.id}
                          control={
                            <Checkbox
                              checked={formData.trigger_events.includes(event.id)}
                              onChange={(e) => {
                                const newSelectedEvents = e.target.checked
                                  ? [...formData.trigger_events, event.id]
                                  : formData.trigger_events.filter(id => id !== event.id);

                                if (newSelectedEvents.length > 0) {
                                  loadEventVersions(newSelectedEvents[0]);
                                  setFormData({
                                    ...formData,
                                    trigger_events: newSelectedEvents,
                                    trigger_event_version: 'latest'
                                  });
                                } else {
                                  setFormData({ ...formData, trigger_events: newSelectedEvents });
                                }
                              }}
                              size="small"
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2">{event.name}</Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: event.event_type === 'system' ? 'secondary.main' : 'primary.main',
                                  fontWeight: 500,
                                }}
                              >
                                ({event.event_type === 'system' ? 'System' : 'Custom'})
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontWeight: 600,
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                }}
                              >
                                v{event.version || 1}
                              </Typography>
                            </Box>
                          }
                          sx={{ width: '100%', mx: 0, my: 0.25 }}
                        />
                      ))
                    )}
                  </Paper>
                  {formData.trigger_events.length === 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'error.main' }}>
                      Please select at least one event
                    </Typography>
                  )}
                </Box>
              )}

              {formData.trigger_type === 'event' && Array.isArray(formData.trigger_events) && formData.trigger_events.length > 0 && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                    Select Event Version
                  </Typography>
                  <select
                    name="trigger_event_version"
                    value={formData.trigger_event_version}
                    onChange={handleChange}
                    disabled={loadingVersions}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="latest">Latest Version (Auto) - Always uses the most recent version</option>
                    {eventVersions.map((version) => (
                      <option key={version.version} value={version.version}>
                        Version {version.version} (Created: {version.created_at})
                      </option>
                    ))}
                  </select>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                    Select a specific version or use the latest version automatically
                  </Typography>
                </Box>
              )}

              {formData.trigger_type === 'schedule' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Schedule-based triggers are coming soon. This feature is currently under development.
                </Alert>
              )}
            </>
          )}

          {sequence && (
            <>
              <TextField
                select
                name="sequence_type"
                label="Sequence Type"
                value={formData.sequence_type}
                onChange={handleChange}
                fullWidth
                margin="normal"
                helperText="Select whether this is a system or custom sequence"
              >
                <MenuItem value="system">System Sequence</MenuItem>
                <MenuItem value="custom">Custom Sequence</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={handleStatusToggle}
                    color="primary"
                  />
                }
                label={formData.status === 'active' ? 'Active' : 'Inactive'}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={formData.trigger_type === 'schedule' && !sequence}
          >
            {sequence ? 'Update' : 'Create Sequence'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SequenceForm;
