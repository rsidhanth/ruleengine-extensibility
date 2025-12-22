import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as CreateIcon,
  ContentCopy as TemplateIcon,
} from '@mui/icons-material';

const SequenceTypeSelector = ({ open, onClose, onSelectType }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Create New Sequence
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: '#6b7280',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose how you want to create your sequence
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
          <Card
            sx={{
              cursor: 'pointer',
              border: '2px solid #e5e7eb',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#3b82f6',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
            onClick={() => onSelectType('fresh')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CreateIcon sx={{ color: '#3b82f6', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1.125rem' }}>
                    Create Fresh Sequence
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start from scratch and build your workflow step by step with complete control
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              cursor: 'pointer',
              border: '2px solid #e5e7eb',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#8b5cf6',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
                transform: 'translateY(-2px)',
              },
            }}
            onClick={() => onSelectType('template')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: '#f5f3ff',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TemplateIcon sx={{ color: '#8b5cf6', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1.125rem' }}>
                    Start from Template
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose from pre-built templates and customize them to fit your needs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SequenceTypeSelector;
