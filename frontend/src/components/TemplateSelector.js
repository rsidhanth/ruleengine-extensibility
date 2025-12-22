import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';

// Mock templates - in production, this would come from an API
const mockTemplates = [
  {
    id: 1,
    name: 'Erasure Request',
    description: 'Handle user data erasure requests in compliance with privacy regulations',
    category: 'Privacy Compliance',
    nodeCount: 6,
    trigger: 'Erasure Request Event',
  },
  {
    id: 2,
    name: 'Consent Withdrawal',
    description: 'Process user consent withdrawal and update consent records',
    category: 'Consent Management',
    nodeCount: 5,
    trigger: 'Consent Withdrawal Event',
  },
  {
    id: 3,
    name: 'Account Closure',
    description: 'Complete account closure workflow including data retention and deletion',
    category: 'User Management',
    nodeCount: 7,
    trigger: 'Account Closure Request Event',
  },
  {
    id: 4,
    name: 'Purpose Expiry',
    description: 'Handle data processing purpose expiration and compliance actions',
    category: 'Data Governance',
    nodeCount: 4,
    trigger: 'Purpose Expiry Event',
  },
];

const TemplateSelector = ({ open, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (open) {
      // Simulate API call
      setTimeout(() => {
        setTemplates(mockTemplates);
        setLoading(false);
      }, 500);
    }
  }, [open]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleContinue = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Privacy Compliance': '#ef4444',
      'Consent Management': '#3b82f6',
      'User Management': '#10b981',
      'Data Governance': '#8b5cf6',
    };
    return colors[category] || '#6b7280';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Select a Template
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
          Choose a template to start building your sequence. You can customize it after selection.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {templates.map((template) => (
              <Box key={template.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: `2px solid ${
                      selectedTemplate?.id === template.id ? '#3b82f6' : '#e5e7eb'
                    }`,
                    transition: 'all 0.2s ease',
                    backgroundColor:
                      selectedTemplate?.id === template.id ? '#eff6ff' : '#ffffff',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          backgroundColor: `${getCategoryColor(template.category)}15`,
                          borderRadius: 1.5,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WorkflowIcon
                          sx={{ color: getCategoryColor(template.category), fontSize: '1.5rem' }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, fontSize: '0.9375rem' }}
                        >
                          {template.name}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, fontSize: '0.8125rem', lineHeight: 1.5, flexGrow: 1 }}
                    >
                      {template.description}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        pt: 2,
                        borderTop: '1px solid #e5e7eb',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        <strong>{template.nodeCount}</strong> nodes
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Trigger: <strong>{template.trigger}</strong>
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleContinue}
          variant="contained"
          disabled={!selectedTemplate}
          sx={{
            textTransform: 'none',
            backgroundColor: '#3b82f6',
            '&:hover': {
              backgroundColor: '#2563eb',
            },
          }}
        >
          Continue with Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateSelector;
