import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const APINode = ({ data, id }) => {
  const apiConfig = data.apiConfig || {};
  const hasConfig = apiConfig.url || apiConfig.name;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    console.log('API Settings clicked!', { id, data, hasHandler: !!data.onSettingsClick });
    if (data.onSettingsClick) {
      data.onSettingsClick(id, data);
    } else {
      console.error('onSettingsClick handler is not defined!');
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
        border: '2px solid #3b82f6',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#3b82f6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#3b82f6',
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
        <span>API CALL</span>
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
        }}
      >
        {!hasConfig ? (
          <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic' }}>
            Click settings to configure API
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {apiConfig.name && (
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {apiConfig.name}
              </Typography>
            )}
            {apiConfig.method && (
              <Chip
                label={apiConfig.method}
                size="small"
                sx={{
                  backgroundColor: `${getMethodColor(apiConfig.method)}20`,
                  color: getMethodColor(apiConfig.method),
                  fontSize: '0.7rem',
                  height: '20px',
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              />
            )}
            {apiConfig.url && (
              <Typography
                variant="caption"
                sx={{
                  color: '#6b7280',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {apiConfig.url}
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
          background: '#3b82f6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </Box>
  );
};

export default APINode;
