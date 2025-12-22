import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

const EventDetailsDrawer = ({ open, onClose, events = [] }) => {
  const handleCopyUrl = (url) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      // Could add a snackbar notification here
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 500 },
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
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Trigger Event Details
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {events.length === 0 ? (
            <Alert severity="info">No trigger events configured</Alert>
          ) : (
            events.map((event, index) => (
              <Box key={event.id} sx={{ mb: 3 }}>
                {/* Event Name */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {event.name}
                  </Typography>
                  {event.description && (
                    <Typography variant="body2" color="text.secondary">
                      {event.description}
                    </Typography>
                  )}
                </Box>

                {/* Event Type & Status */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={event.event_type === 'system' ? 'System Event' : 'Custom Event'}
                    size="small"
                    color={event.event_type === 'system' ? 'secondary' : 'primary'}
                  />
                  <Chip
                    label={event.status === 'active' ? 'Active' : 'Inactive'}
                    size="small"
                    color={event.status === 'active' ? 'success' : 'default'}
                  />
                </Box>

                {/* Event ID */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Event ID
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 500,
                      backgroundColor: '#f9fafb',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      mt: 0.5,
                    }}
                  >
                    {event.event_id}
                  </Typography>
                </Box>

                {/* Webhook URL */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Webhook Endpoint
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mt: 0.5,
                      backgroundColor: '#f9fafb',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        flex: 1,
                        wordBreak: 'break-all',
                      }}
                    >
                      {event.webhook_endpoint}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyUrl(event.webhook_endpoint)}
                      sx={{
                        padding: '4px',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'white',
                        },
                      }}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Event Fields */}
                {event.event_format && event.event_format.properties && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                      Available Fields
                    </Typography>
                    <List sx={{ p: 0 }}>
                      {Object.entries(event.event_format.properties).map(([key, fieldDef]) => (
                        <ListItem
                          key={key}
                          sx={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 1,
                            border: '1px solid #e5e7eb',
                            mb: 1,
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                color: '#059669',
                              }}
                            >
                              {fieldDef.label || key}
                            </Typography>
                            <Chip
                              label={fieldDef.type || 'string'}
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
                          {fieldDef.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                            >
                              {fieldDef.description}
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              mt: 0.5,
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              color: '#6b7280',
                            }}
                          >
                            Path: {fieldDef.path || key}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Divider between events */}
                {index < events.length - 1 && <Divider sx={{ my: 3 }} />}
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {events.length === 1
              ? '1 trigger event configured'
              : `${events.length} trigger events configured`}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default EventDetailsDrawer;
