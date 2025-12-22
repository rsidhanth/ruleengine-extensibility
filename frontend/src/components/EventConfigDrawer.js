import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  FlashOn as EventIcon,
} from '@mui/icons-material';
import { eventsApi } from '../services/api';

const EventConfigDrawer = ({ open, onClose, nodeData, onSave }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load events on mount
  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open]);

  // Load existing configuration from nodeData
  useEffect(() => {
    if (nodeData && nodeData.eventConfig) {
      const config = nodeData.eventConfig;
      if (config.eventId) {
        setSelectedEvent(config.eventId);
      }
    }
  }, [nodeData]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await eventsApi.getAll();
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
      alert('Failed to load events. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (e) => {
    const eventId = parseInt(e.target.value);
    setSelectedEvent(eventId);
  };

  const handleSave = () => {
    const event = events.find(e => e.id === selectedEvent);

    // Ensure we preserve all node data including nodeType
    const updatedData = {
      ...nodeData,
      nodeType: nodeData?.nodeType || 'event', // Ensure nodeType is always set
      eventConfig: {
        eventId: selectedEvent,
        eventName: event?.name,
        eventIdNumber: event?.event_id,
        eventType: event?.event_type,
      },
    };

    console.log('EventConfigDrawer saving data:', updatedData);
    onSave(updatedData);
    onClose();
  };

  const selectedEventDetails = events.find(e => e.id === selectedEvent);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 450 },
      }}
      sx={{
        zIndex: 10000,
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon sx={{ color: '#ec4899' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Configure Event Trigger
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Alert severity="info" sx={{ mb: 3, fontSize: '0.875rem' }}>
            Select an event to trigger from this node. When this node executes, it will trigger the selected event, which will start any sequences listening to that event.
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: '#374151' }}>
              Select Event to Trigger
            </Typography>

            <select
              value={selectedEvent || ''}
              onChange={handleEventChange}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: loading ? '#f9fafb' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="">
                {loading ? 'Loading events...' : 'Select an event to trigger'}
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} (ID: {event.event_id}) - {event.event_type === 'system' ? 'System' : 'Custom'}
                </option>
              ))}
            </select>
          </Box>

          {selectedEventDetails && (
            <>
              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#111827' }}>
                Selected Event Details
              </Typography>

              <Box sx={{ backgroundColor: '#f9fafb', p: 2, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                    Event Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                    {selectedEventDetails.name}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                    Event ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#111827' }}>
                    {selectedEventDetails.event_id}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                    Event Type
                  </Typography>
                  <Chip
                    label={selectedEventDetails.event_type === 'system' ? 'System Event' : 'Custom Event'}
                    size="small"
                    color={selectedEventDetails.event_type === 'system' ? 'secondary' : 'primary'}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>

                {selectedEventDetails.description && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#374151', fontSize: '0.875rem' }}>
                      {selectedEventDetails.description}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Note:
                </Typography>
                <Typography variant="caption">
                  When this event is triggered, all active sequences listening to this event will be automatically started. Make sure the event payload matches the expected format.
                </Typography>
              </Alert>
            </>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: 2,
          }}
        >
          <Button variant="outlined" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            fullWidth
            disabled={!selectedEvent}
            sx={{
              backgroundColor: '#ec4899',
              '&:hover': {
                backgroundColor: '#db2777',
              },
            }}
          >
            Save Configuration
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default EventConfigDrawer;
