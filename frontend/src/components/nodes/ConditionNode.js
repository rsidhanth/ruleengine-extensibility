import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import notification from '@leegality/leegality-react-component-library/dist/notification';

const ConditionNode = ({ data, id }) => {
  // Add defensive checks for data
  if (!data) {
    console.error('ConditionNode received undefined data', { id });
    return (
      <Box sx={{ padding: 2, border: '2px solid red', borderRadius: 2 }}>
        <Typography color="error">Error: Node data is missing</Typography>
      </Box>
    );
  }

  const conditionSets = data.conditionSets || [];
  const hasConditionSets = conditionSets.length > 0;

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    console.log('Settings clicked!', {
      id,
      data,
      hasHandler: !!data.onSettingsClick,
      nodeType: data.nodeType
    });

    if (!data.onSettingsClick) {
      console.error('onSettingsClick handler is not defined!', { id, data });
      notification.error('Settings handler is not configured', 'Please try refreshing the page.');
      return;
    }

    try {
      data.onSettingsClick(id, data);
    } catch (error) {
      console.error('Error in onSettingsClick handler:', error);
      notification.error('Error opening settings', 'Check console for details.');
    }
  };

  return (
    <Box
      sx={{
        minWidth: 220,
        background: 'transparent',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid #10b981',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#10b981',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#10b981',
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
        <span>CONDITION</span>
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
            zIndex: 1,
          }}
        />

        {!hasConditionSets ? (
          <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic', pr: 6 }}>
            Click settings to add conditions
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pr: 6 }}>
            {conditionSets.map((set, index) => (
              <Box key={set.id || index} sx={{ position: 'relative' }}>
                <Chip
                  label={set.label || `Condition Set ${index + 1}`}
                  size="small"
                  sx={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    fontSize: '0.7rem',
                    height: '24px',
                    fontWeight: 500,
                    width: '100%',
                    justifyContent: 'flex-start',
                  }}
                />
                {/* Output Handle for each condition set */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`set-${index}`}
                  style={{
                    background: '#10b981',
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    right: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Default/Else Handle */}
      {hasConditionSets && (
        <Box
          sx={{
            backgroundColor: '#f3f4f6',
            px: 2,
            py: 1,
            borderTop: '1px solid #e5e7eb',
            position: 'relative',
          }}
        >
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem', fontWeight: 500 }}>
            None match (else)
          </Typography>
          <Handle
            type="source"
            position={Position.Bottom}
            id="else"
            style={{
              background: '#6b7280',
              width: 10,
              height: 10,
              border: '2px solid white',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ConditionNode;
