import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

const WorkflowRuleForm = ({ open, onClose, onSave, rule = null, workflow }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_definition: '',
    trigger_step: 1,
    execution_order: 1,
    is_active: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        description: rule.description || '',
        rule_definition: rule.rule_definition || '',
        trigger_step: rule.trigger_step || 1,
        execution_order: rule.execution_order || 1,
        is_active: rule.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        rule_definition: '',
        trigger_step: 1,
        execution_order: 1,
        is_active: true,
      });
    }
    setError('');
  }, [rule, open]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (!formData.rule_definition.trim()) {
      setError('Rule definition is required');
      return;
    }

    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message || 'Failed to save rule');
    }
  };

  const insertSampleRule = (sampleType) => {
    let sampleRule = '';
    
    switch (sampleType) {
      case 'validation':
        sampleRule = `// Validation rule example
if ({{customer_id}} is_null) {
    error "Customer ID is required"
}

if ({{stamp_amount}} < 100) {
    error "Stamp amount must be at least 100"
}`;
        break;
      case 'assignment':
        sampleRule = `// Assignment rule example
if ({{stamp_amount}} > 1000) {
    assign {{priority}} = "HIGH"
    assign {{requires_approval}} = true
} else {
    assign {{priority}} = "NORMAL"
    assign {{requires_approval}} = false
}`;
        break;
      case 'document_check':
        sampleRule = `// Document validation example
for (@doc in {{documents}}) {
    if (@doc.document_name is_null) {
        error "Document name is required for all documents"
    }
    
    if (@doc.invitee_email is_null) {
        error "Invitee email is required for document: " + @doc.document_name
    }
}`;
        break;
      default:
        sampleRule = `// Simple rule example
if ({{customer_id}} == "PREMIUM_CUSTOMER") {
    assign {{discount}} = 10
    assign {{fast_track}} = true
}`;
    }
    
    setFormData({
      ...formData,
      rule_definition: sampleRule
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {rule ? 'Edit Rule' : 'New Rule'} - {workflow?.name}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            name="name"
            label="Rule Name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            autoFocus
          />
          
          <TextField
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={2}
            placeholder="Describe what this rule does..."
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Trigger Step</InputLabel>
            <Select
              name="trigger_step"
              value={formData.trigger_step}
              onChange={handleChange}
              label="Trigger Step"
            >
              <MenuItem value={1}>Step 1 (Before Step 2)</MenuItem>
              <MenuItem value={2}>Step 2 (Before Completion)</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            name="execution_order"
            label="Execution Order"
            type="number"
            value={formData.execution_order}
            onChange={handleChange}
            fullWidth
            margin="normal"
            helperText="Order in which this rule will execute (lower numbers execute first)"
          />
          
          <FormControlLabel
            control={
              <Switch
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
            }
            label="Active"
            sx={{ mt: 1, mb: 2 }}
          />

          {/* Sample Rules */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Sample Rules</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => insertSampleRule('validation')}
                >
                  Validation Rule
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => insertSampleRule('assignment')}
                >
                  Assignment Rule
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => insertSampleRule('document_check')}
                >
                  Document Check
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => insertSampleRule('simple')}
                >
                  Simple Rule
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Click any sample to insert it into the rule definition. You can modify and customize as needed.
              </Typography>
            </AccordionDetails>
          </Accordion>
          
          <TextField
            name="rule_definition"
            label="Rule Definition"
            value={formData.rule_definition}
            onChange={handleChange}
            fullWidth
            margin="normal"
            multiline
            rows={12}
            required
            placeholder="Enter your rule definition using Leegality DSL syntax..."
            helperText={
              <Box component="span">
                <Typography variant="caption" display="block">
                  Available context data: {'{irn}'}, {'{customer_id}'}, {'{stamp_group}'}, {'{stamp_amount}'}, {'{documents}'}
                </Typography>
                <Typography variant="caption" display="block">
                  Example: if ({'{stamp_amount}'} {`>`} 1000) {'{'} assign {'{priority}'} = "HIGH" {'}'}
                </Typography>
              </Box>
            }
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }
            }}
          />

          {/* Rule Syntax Help */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Rule Syntax Help</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ '& pre': { fontSize: '0.75rem', overflow: 'auto' } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Basic Syntax:
                </Typography>
                <pre>{`// Conditions
if ({{customer_id}} == "PREMIUM") {
    assign {{discount}} = 10
}

// Loops
for (@doc in {{documents}}) {
    if (@doc.document_name is_null) {
        error "Document name required"
    }
}

// Variables
var @total = {{stamp_amount}} + 100

// Available Operators
==, !=, <, >, <=, >=, is_null, not_null

// Available Functions
length(string), sum(numbers), contains(string, substring)
date(), time(), concat(strings...)`}</pre>
              </Box>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {rule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default WorkflowRuleForm;