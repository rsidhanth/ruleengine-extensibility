import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { Settings as SettingsIcon, Code as CodeIcon } from '@mui/icons-material';

const CustomRuleNode = ({ data, id }) => {
  // Add defensive checks for data
  if (!data) {
    console.error('CustomRuleNode received undefined data', { id });
    return (
      <Box sx={{ padding: 2, border: '2px solid red', borderRadius: 2 }}>
        <Typography color="error">Error: Node data is missing</Typography>
      </Box>
    );
  }

  const customRuleConfig = data.customRuleConfig || {};
  const hasCustomRuleConfig = customRuleConfig.name && customRuleConfig.code;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    console.log('Custom Rule Settings clicked!', {
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
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#3b82f6',
          width: 12,
          height: 12,
          border: '2px solid #fff',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon sx={{ fontSize: '1rem' }} />
          <span>CUSTOM RULE</span>
        </Box>
        <IconButton
          size="small"
          onClick={handleSettingsClick}
          className="nodrag nopan"
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

        {!hasCustomRuleConfig ? (
          <Typography
            variant="body2"
            sx={{
              color: '#9ca3af',
              fontSize: '0.8rem',
              fontStyle: 'italic',
              pr: 6,
            }}
          >
            Click settings to configure custom rule
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pr: 6 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#111827',
                fontSize: '0.85rem',
              }}
            >
              {customRuleConfig.name}
            </Typography>
            {customRuleConfig.description && (
              <Typography
                variant="caption"
                sx={{
                  color: '#6b7280',
                  fontSize: '0.7rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {customRuleConfig.description}
              </Typography>
            )}
            <Box
              sx={{
                backgroundColor: '#dbeafe',
                color: '#2563eb',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.65rem',
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              DSL SCRIPT
            </Box>
          </Box>
        )}
      </Box>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#3b82f6',
          width: 12,
          height: 12,
          border: '2px solid #fff',
        }}
      />
    </Box>
  );
};

export default CustomRuleNode;
