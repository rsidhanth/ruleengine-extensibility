import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, IconButton, Typography, Chip, Button } from '@mui/material';
import { Settings as SettingsIcon, Edit as EditIcon } from '@mui/icons-material';

const EventTriggerNode = ({ data }) => {
  const { triggerEvents = [], onSettingsClick, onEditClick, onViewAllClick } = data;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    if (onSettingsClick) {
      onSettingsClick(triggerEvents);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEditClick) {
      onEditClick();
    }
  };

  const handleViewAllClick = (e) => {
    e.stopPropagation();
    if (onViewAllClick) {
      onViewAllClick();
    }
  };

  return (
    <Box
      sx={{
        minWidth: 220,
        background: 'transparent',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid #f59e0b',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#f59e0b',
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
        <span>TRIGGER</span>
        <Box>
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
          <IconButton
            size="small"
            onClick={handleEditClick}
            sx={{
              color: 'white',
              padding: '2px',
              ml: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            <EditIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          backgroundColor: '#ffffff',
          color: '#374151',
          px: 2,
          py: 2,
          minHeight: 80,
        }}
      >
        {triggerEvents.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No events selected
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.875rem' }}>
              {triggerEvents.length === 1
                ? triggerEvents[0].name
                : `${triggerEvents.length} Events`}
            </Typography>
            {triggerEvents.length > 1 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {triggerEvents.slice(0, 2).map((event, index) => (
                  <React.Fragment key={event.id}>
                    {index > 0 && (
                      <Typography variant="caption" sx={{ color: '#6b7280', alignSelf: 'center', px: 0.5 }}>
                        OR
                      </Typography>
                    )}
                    <Chip
                      label={event.name}
                      size="small"
                      sx={{
                        height: '20px',
                        fontSize: '0.65rem',
                        backgroundColor: '#eff6ff',
                        color: '#3b82f6',
                      }}
                    />
                  </React.Fragment>
                ))}
                {triggerEvents.length > 2 && (
                  <Chip
                    label={`+${triggerEvents.length - 2}`}
                    size="small"
                    sx={{
                      height: '20px',
                      fontSize: '0.65rem',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                    }}
                  />
                )}
              </Box>
            )}
            {triggerEvents.length > 1 && (
              <Button
                size="small"
                variant="text"
                onClick={handleViewAllClick}
                sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.5, px: 1, minWidth: 'auto' }}
              >
                View All
              </Button>
            )}
          </>
        )}
      </Box>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#f59e0b',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </Box>
  );
};

export default EventTriggerNode;
