import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { Settings as SettingsIcon, FlashOn as EventIcon } from '@mui/icons-material';

const EventNode = ({ data, id }) => {
  // Add defensive checks for data
  if (!data) {
    console.error('EventNode received undefined data', { id });
    return (
      <Box sx={{ padding: 2, border: '2px solid red', borderRadius: 2 }}>
        <Typography color="error">Error: Node data is missing</Typography>
      </Box>
    );
  }

  const eventConfig = data.eventConfig || {};
  const hasEventConfig = eventConfig.eventId && eventConfig.eventName;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    console.log('Event Settings clicked!', {
      id,
      data,
      hasHandler: !!data.onSettingsClick,
      nodeType: data.nodeType
    });

    if (!data.onSettingsClick) {
      console.error('onSettingsClick handler is not defined!', { id, data });
      alert('Error: Settings handler is not configured. Please try refreshing the page.');
      return;
    }

    // Call the handler with proper parameters
    try {
      data.onSettingsClick(id, data);
    } catch (error) {
      console.error('Error in onSettingsClick handler:', error);
      alert('Error opening settings. Check console for details.');
    }
  };

  return (
    <Box
      sx={{
        minWidth: 220,
        background: 'transparent',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid #ec4899',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#ec4899',
          width: 12,
          height: 12,
          border: '2px solid #fff',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#ec4899',
          color: 'white',
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon sx={{ fontSize: '1rem' }} />
          <span>TRIGGER EVENT</span>
        </Box>
        <IconButton
          size="small"
          onClick={handleSettingsClick}
          sx={{
            color: 'white',
            padding: '2px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <SettingsIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ backgroundColor: '#ffffff', color: '#374151', p: 2, minHeight: 60, position: 'relative' }}>
        {/* Node ID Badge */}
        <Chip
          label={id}
          size="small"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            height: '18px',
            fontSize: '0.65rem',
            fontFamily: 'monospace',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontWeight: 600,
            '& .MuiChip-label': {
              px: 0.75,
            },
          }}
        />

        {!hasEventConfig ? (
          <Typography
            variant="body2"
            sx={{
              color: '#9ca3af',
              fontSize: '0.8rem',
              fontStyle: 'italic',
              pr: 6,
            }}
          >
            Click settings to configure event
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pr: 6 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>
              Event to Trigger
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#111827',
                fontSize: '0.85rem',
              }}
            >
              {eventConfig.eventName}
            </Typography>
            {eventConfig.eventIdNumber && (
              <Chip
                label={`Event ID: ${eventConfig.eventIdNumber}`}
                size="small"
                sx={{
                  fontSize: '0.7rem',
                  height: '20px',
                  backgroundColor: '#fce7f3',
                  color: '#ec4899',
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              />
            )}
            {eventConfig.eventType && (
              <Typography variant="caption" sx={{ color: '#ec4899', fontSize: '0.7rem' }}>
                {eventConfig.eventType === 'system' ? 'System Event' : 'Custom Event'}
              </Typography>
            )}
            {eventConfig.parameterMappings && Object.keys(eventConfig.parameterMappings).length > 0 && (
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem', mt: 0.5 }}>
                {Object.keys(eventConfig.parameterMappings).length} parameter(s) mapped
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#ec4899',
          width: 12,
          height: 12,
          border: '2px solid #fff',
        }}
      />
    </Box>
  );
};

export default EventNode;
