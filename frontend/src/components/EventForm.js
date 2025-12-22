import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
  MenuItem,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
} from '@mui/material';

const defaultEventFormat = {
  cpId: '{{CP ID}}',
  consentProfileId: '{{Consent profile ID}}',
  purposes: ['purpose_001', 'purpose_002', 'purpose_003'],
  customParameter: '{{Custom parameter}}'
};

const sampleAcknowledgementPayload = {
  status: 'success',
  message: 'Event received successfully',
  timestamp: '2024-01-01T00:00:00Z'
};

const EventForm = ({ open, onClose, onSave, event = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_format: {},
    acknowledgement_enabled: false,
    acknowledgement_type: 'basic',
    acknowledgement_status_code: 200,
    acknowledgement_payload: {},
    status: 'active',
  });
  const [error, setError] = useState('');
  const [eventFormatJson, setEventFormatJson] = useState('');
  const [acknowledgementPayloadJson, setAcknowledgementPayloadJson] = useState('');

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name || '',
        description: event.description || '',
        event_format: event.event_format || {},
        acknowledgement_enabled: event.acknowledgement_enabled || false,
        acknowledgement_type: event.acknowledgement_type || 'basic',
        acknowledgement_status_code: event.acknowledgement_status_code || 200,
        acknowledgement_payload: event.acknowledgement_payload || {},
        status: event.status || 'active',
      });
      setEventFormatJson(JSON.stringify(event.event_format || defaultEventFormat, null, 2));
      setAcknowledgementPayloadJson(JSON.stringify(event.acknowledgement_payload || sampleAcknowledgementPayload, null, 2));
    } else {
      setFormData({
        name: '',
        description: '',
        event_format: defaultEventFormat,
        acknowledgement_enabled: false,
        acknowledgement_type: 'basic',
        acknowledgement_status_code: 200,
        acknowledgement_payload: {},
        status: 'active',
      });
      setEventFormatJson(JSON.stringify(defaultEventFormat, null, 2));
      setAcknowledgementPayloadJson(JSON.stringify(sampleAcknowledgementPayload, null, 2));
    }
    setError('');
  }, [event, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEventFormatChange = (e) => {
    const value = e.target.value;
    setEventFormatJson(value);

    // Try to parse JSON
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        setFormData({
          ...formData,
          event_format: parsed,
        });
      } else {
        setFormData({
          ...formData,
          event_format: {},
        });
      }
    } catch (err) {
      // Invalid JSON, don't update formData yet
    }
  };

  const handleAcknowledgementPayloadChange = (e) => {
    const value = e.target.value;
    setAcknowledgementPayloadJson(value);

    // Try to parse JSON
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        setFormData({
          ...formData,
          acknowledgement_payload: parsed,
        });
      } else {
        setFormData({
          ...formData,
          acknowledgement_payload: {},
        });
      }
    } catch (err) {
      // Invalid JSON, don't update formData yet
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Event name is required');
      return;
    }

    // Validate JSON format if provided
    if (eventFormatJson.trim()) {
      try {
        JSON.parse(eventFormatJson);
      } catch (err) {
        setError('Invalid JSON format in Event Format field');
        return;
      }
    }

    // Validate acknowledgement payload JSON if custom type and enabled
    if (formData.acknowledgement_enabled && formData.acknowledgement_type === 'custom' && acknowledgementPayloadJson.trim()) {
      try {
        JSON.parse(acknowledgementPayloadJson);
      } catch (err) {
        setError('Invalid JSON format in Acknowledgement Payload field');
        return;
      }
    }

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save event');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {event ? 'Edit Event' : 'Create New Event'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            name="name"
            label="Event Name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            helperText="A descriptive name for the event"
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
            helperText="Describe when this event is triggered"
          />

          <Divider sx={{ my: 3 }} />

          {/* Event Format JSON Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Event Payload Format (JSON)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Define the JSON structure for this event. Use placeholders like {'{'}{'{'}}CP ID{'}'}{'}'} for dynamic values.
            </Typography>

            <TextField
              label="Event Format"
              value={eventFormatJson}
              onChange={handleEventFormatChange}
              fullWidth
              multiline
              rows={10}
              helperText="Define the event structure with placeholders for dynamic values"
              sx={{
                '& textarea': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Event Acknowledgement Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Webhook Acknowledgement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure how the system responds when this webhook is received
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  name="acknowledgement_enabled"
                  checked={formData.acknowledgement_enabled}
                  onChange={handleChange}
                  color="primary"
                />
              }
              label="Enable Acknowledgement Response"
            />

            {formData.acknowledgement_enabled && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '3px solid #7c3aed' }}>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend" sx={{ mb: 1 }}>Response Type</FormLabel>
                  <RadioGroup
                    name="acknowledgement_type"
                    value={formData.acknowledgement_type}
                    onChange={handleChange}
                    row
                  >
                    <FormControlLabel
                      value="basic"
                      control={<Radio />}
                      label="Basic Success Response"
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio />}
                      label="Custom Success Response"
                    />
                  </RadioGroup>
                </FormControl>

                <TextField
                  select
                  name="acknowledgement_status_code"
                  label="HTTP Status Code"
                  value={formData.acknowledgement_status_code}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  helperText="HTTP status code to return when event is received"
                >
                  <MenuItem value={200}>200</MenuItem>
                  <MenuItem value={201}>201</MenuItem>
                  <MenuItem value={202}>202</MenuItem>
                  <MenuItem value={203}>203</MenuItem>
                </TextField>

                {formData.acknowledgement_type === 'custom' && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Custom Response Payload
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Define a static JSON payload to return. Dynamic values are not supported in acknowledgement responses.
                    </Typography>
                    <TextField
                      label="Acknowledgement Payload (JSON)"
                      value={acknowledgementPayloadJson}
                      onChange={handleAcknowledgementPayloadChange}
                      fullWidth
                      margin="normal"
                      multiline
                      rows={8}
                      helperText="Static JSON payload to return in the acknowledgement response"
                      sx={{
                        '& textarea': {
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Event Status Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Event Status
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.status === 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'inactive' })}
                  color="primary"
                />
              }
              label={formData.status === 'active' ? 'Active' : 'Inactive'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {event ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventForm;
