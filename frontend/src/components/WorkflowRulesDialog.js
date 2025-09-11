import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Alert,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
} from '@mui/icons-material';
import { workflowRulesApi } from '../services/api';
import WorkflowRuleForm from './WorkflowRuleForm';

const WorkflowRulesDialog = ({ open, onClose, workflow }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (open && workflow) {
      loadRules();
    }
  }, [open, workflow]);

  const loadRules = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await workflowRulesApi.getAll(workflow.id);
      setRules(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setSelectedRule(null);
    setShowRuleForm(true);
  };

  const handleEditRule = (rule) => {
    setSelectedRule(rule);
    setShowRuleForm(true);
  };

  const handleDeleteRule = async (rule) => {
    if (window.confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      try {
        await workflowRulesApi.delete(rule.id);
        loadRules();
      } catch (err) {
        setError('Failed to delete rule');
      }
    }
  };

  const handleTestRule = async (rule) => {
    setTestResult(null);
    setError('');
    
    try {
      const response = await workflowRulesApi.testRule(rule.id, {
        context: {
          irn: 'IRN001',
          customer_id: 'CUST123',
          stamp_group: 'GROUP_A',
          stamp_amount: 1000.00,
          documents: [
            {
              document_status: 'PENDING',
              document_name: 'Test Document',
              document_id: 'DOC123',
              invitee_name: 'John Doe',
              invitee_email: 'john@example.com'
            }
          ]
        }
      });
      setTestResult(response.data);
    } catch (err) {
      setError('Failed to test rule');
    }
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const dataWithWorkflow = {
        ...ruleData,
        workflow: workflow.id
      };

      if (selectedRule) {
        await workflowRulesApi.update(selectedRule.id, dataWithWorkflow);
      } else {
        await workflowRulesApi.create(dataWithWorkflow);
      }
      
      setShowRuleForm(false);
      loadRules();
    } catch (err) {
      throw new Error('Failed to save rule');
    }
  };

  if (!workflow) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          Manage Rules - {workflow.name}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Workflow Rules
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRule}
            >
              Add Rule
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : rules.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No rules found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add rules to this workflow to validate and process data during execution.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Trigger Step</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{rule.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {rule.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`Step ${rule.trigger_step}`}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={rule.is_active ? 'Active' : 'Inactive'}
                          color={rule.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {rule.execution_order}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handleTestRule(rule)}
                          title="Test Rule"
                          color="info"
                        >
                          <TestIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditRule(rule)}
                          title="Edit"
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteRule(rule)}
                          title="Delete"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Test Result Display */}
          {testResult && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Rule Test Result
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={testResult.rule_test_result?.success ? 'Success' : 'Failed'}
                  color={testResult.rule_test_result?.success ? 'success' : 'error'}
                />
                {testResult.rule_test_result?.execution_time_ms && (
                  <Chip 
                    label={`${testResult.rule_test_result.execution_time_ms}ms`}
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>

              {testResult.rule_test_result?.result?.errors && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Errors: {testResult.rule_test_result.result.errors.join(', ')}
                </Alert>
              )}

              {testResult.rule_test_result?.result?.warnings && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Warnings: {testResult.rule_test_result.result.warnings.join(', ')}
                </Alert>
              )}

              {testResult.rule_test_result?.result?.assignments && Object.keys(testResult.rule_test_result.result.assignments).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Assignments:
                  </Typography>
                  <Paper sx={{ p: 1, bgcolor: 'success.light' }}>
                    {Object.entries(testResult.rule_test_result.result.assignments).map(([key, value]) => (
                      <Typography key={key} variant="body2">
                        <strong>{key}:</strong> {String(value)}
                      </Typography>
                    ))}
                  </Paper>
                </Box>
              )}

              <Typography variant="subtitle2" gutterBottom>
                Sample Context Data:
              </Typography>
              <Paper sx={{ p: 1, bgcolor: 'info.light' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(testResult.sample_context, null, 2)}
                </Typography>
              </Paper>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Rule Form Dialog */}
      <WorkflowRuleForm
        open={showRuleForm}
        onClose={() => setShowRuleForm(false)}
        onSave={handleSaveRule}
        rule={selectedRule}
        workflow={workflow}
      />
    </>
  );
};

export default WorkflowRulesDialog;