import React from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Chip } from '@mui/material';
import { MergeType as MergeIcon } from '@mui/icons-material';

const MergeNode = ({ data, id }) => {
  // Add defensive checks for data
  if (!data) {
    console.error('MergeNode received undefined data', { id });
    return (
      <Box sx={{ padding: 2, border: '2px solid red', borderRadius: 2 }}>
        <Typography color="error">Error: Node data is missing</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minWidth: 220,
        background: 'transparent',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid #06b6d4',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#06b6d4',
          width: 12,
          height: 12,
          border: '2px solid #fff',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#06b6d4',
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
          <MergeIcon sx={{ fontSize: '1rem' }} />
          <span>MERGE</span>
        </Box>
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

        <Typography
          variant="body2"
          sx={{
            color: '#6b7280',
            fontSize: '0.8rem',
            pr: 6,
          }}
        >
          Waits for all incoming branches to complete before continuing
        </Typography>
      </Box>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#06b6d4',
          width: 12,
          height: 12,
          border: '2px solid #fff',
        }}
      />
    </Box>
  );
};

export default MergeNode;
