import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const ActionNode = ({ data, id }) => {
  // Add defensive checks for data
  if (!data) {
    console.error('ActionNode received undefined data', { id });
    return (
      <Box sx={{ padding: 2, border: '2px solid red', borderRadius: 2 }}>
        <Typography color="error">Error: Node data is missing</Typography>
      </Box>
    );
  }

  const actionConfig = data.actionConfig || {};
  const hasConfig = actionConfig.connectorName && actionConfig.actionName;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    console.log('Action Settings clicked!', {
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

    try {
      data.onSettingsClick(id, data);
    } catch (error) {
      console.error('Error in onSettingsClick handler:', error);
      alert('Error opening settings. Check console for details.');
    }
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: '#10b981',
      POST: '#3b82f6',
      PUT: '#f59e0b',
      DELETE: '#ef4444',
      PATCH: '#8b5cf6',
    };
    return colors[method] || '#6b7280';
  };

  return (
    <Box
      sx={{
        minWidth: 220,
        background: 'transparent',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid #8b5cf6',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#8b5cf6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#8b5cf6',
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
        <span>ACTION</span>
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
      <Box
        sx={{
          backgroundColor: '#ffffff',
          color: '#374151',
          px: 2,
          py: 2,
          minHeight: 60,
          position: 'relative',
        }}
      >
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

        {!hasConfig ? (
          <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic', pr: 6 }}>
            Click settings to configure action
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pr: 6 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>
              {actionConfig.connectorName}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {actionConfig.actionName}
            </Typography>
            {actionConfig.httpMethod && (
              <Chip
                label={actionConfig.httpMethod}
                size="small"
                sx={{
                  backgroundColor: `${getMethodColor(actionConfig.httpMethod)}20`,
                  color: getMethodColor(actionConfig.httpMethod),
                  fontSize: '0.7rem',
                  height: '20px',
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              />
            )}
            {actionConfig.mappedParams > 0 && (
              <Typography variant="caption" sx={{ color: '#8b5cf6', fontSize: '0.7rem' }}>
                {actionConfig.mappedParams} parameter(s) mapped
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#8b5cf6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </Box>
  );
};

export default ActionNode;
