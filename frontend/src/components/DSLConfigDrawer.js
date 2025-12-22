import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

const DSLConfigDrawer = ({ open, onClose, nodeData, onSave }) => {
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [dslCode, setDslCode] = useState('');
  const [error, setError] = useState('');

  console.log('DSLConfigDrawer render - open:', open, 'nodeData:', nodeData);

  const sampleDSL = `// Get CPID from the event
cpid = @event.CPID

// Call the Fetch Systems action from ConsentIn connector
systems_response = call_action("ConsentIn", "Fetch Systems", {
  "query": {
    "cpid": cpid
  }
})

// Extract System IDs from the response
system_ids = systems_response.data.systems.map(system => system.id)

// Assign System IDs to SystemList sequence variable array
@workflow.SystemList = system_ids`;

  useEffect(() => {
    if (nodeData && nodeData.customRuleConfig) {
      setRuleName(nodeData.customRuleConfig.name || '');
      setDescription(nodeData.customRuleConfig.description || '');
      setDslCode(nodeData.customRuleConfig.code || '');
    } else {
      setRuleName('');
      setDescription('');
      setDslCode('');
    }
    setError('');
  }, [nodeData, open]);

  const handleSave = () => {
    if (!ruleName.trim()) {
      setError('Custom rule name is required');
      return;
    }

    if (!dslCode.trim()) {
      setError('DSL code cannot be empty');
      return;
    }

    const updatedData = {
      ...nodeData,
      nodeType: 'custom_rule',
      label: ruleName,
      customRuleConfig: {
        name: ruleName,
        description: description,
        code: dslCode,
      },
    };

    onSave(updatedData);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: 10000,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 600 },
          p: 0,
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Configure Custom Rule
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
              Configure your custom rule with a name, description, and DSL code. The DSL code will be executed when this node is reached in the sequence.
            </Typography>

            {/* Rule Name */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: '#374151' }}>
                Custom Rule Name *
              </Typography>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Enter rule name (e.g., Fetch Systems for CPID)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                }}
              />
            </Box>

            {/* Description */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: '#374151' }}>
                Description
              </Typography>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this custom rule does..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </Box>

            {/* DSL Code */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: '#374151' }}>
                DSL Script Code *
              </Typography>
              <textarea
                value={dslCode}
                onChange={(e) => setDslCode(e.target.value)}
                placeholder={sampleDSL}
                rows={20}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: '"Fira Code", "Courier New", monospace',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: '1.5',
                  minHeight: '300px',
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#6b7280' }}>
                The textarea is expandable - drag from the bottom-right corner to resize
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              backgroundColor: '#eff6ff',
              border: '1px solid #93c5fd',
              borderRadius: 2,
              p: 2,
              mb: 3,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e40af', mb: 1 }}>
              DSL Syntax Guide
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, color: '#374151', fontSize: '0.875rem' }}>
              <li>
                <strong>Access event variables:</strong> <code>@event.fieldName</code>
              </li>
              <li>
                <strong>Access workflow variables:</strong> <code>@workflow.variableName</code>
              </li>
              <li>
                <strong>Set workflow variables:</strong> <code>@workflow.variableName = value</code>
              </li>
              <li>
                <strong>Call actions:</strong> <code>result = call_action("ConnectorName", "ActionName", params)</code>
              </li>
              <li>
                <strong>Loops:</strong> <code>for item in collection: ... end</code>
              </li>
              <li>
                <strong>Conditions:</strong> <code>if condition: ... end</code>
              </li>
              <li>
                <strong>Logging:</strong> <code>log("message")</code>
              </li>
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
          }}
        >
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save Configuration
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default DSLConfigDrawer;
