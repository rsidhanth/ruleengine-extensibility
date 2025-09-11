import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Grid,
  IconButton,
  Paper,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { workflowsApi, workflowExecutionsApi } from '../services/api';

const WorkflowExecutionDialog = ({ open, onClose, workflow }) => {
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ruleResults, setRuleResults] = useState([]);

  // Step 1 form data
  const [step1Data, setStep1Data] = useState({
    irn: '',
    customer_id: '',
    stamp_group: '',
    stamp_amount: '',
  });

  // Step 2 form data
  const [step2Data, setStep2Data] = useState([
    {
      document_status: '',
      document_name: '',
      document_id: '',
      invitee_name: '',
      invitee_email: '',
    }
  ]);

  useEffect(() => {
    if (open && workflow) {
      initializeExecution();
    }
  }, [open, workflow]);

  const initializeExecution = async () => {
    setLoading(true);
    setError('');
    setRuleResults([]);
    
    try {
      const response = await workflowsApi.createExecution(workflow.id);
      setExecution(response.data);
      
      // Reset form data
      setStep1Data({
        irn: '',
        customer_id: '',
        stamp_group: '',
        stamp_amount: '',
      });
      
      setStep2Data([
        {
          document_status: '',
          document_name: '',
          document_id: '',
          invitee_name: '',
          invitee_email: '',
        }
      ]);
    } catch (err) {
      setError('Failed to initialize workflow execution');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Change = (e) => {
    setStep1Data({
      ...step1Data,
      [e.target.name]: e.target.value,
    });
  };

  const handleStep2Change = (index, field, value) => {
    const newData = [...step2Data];
    newData[index][field] = value;
    setStep2Data(newData);
  };

  const addStep2Item = () => {
    setStep2Data([
      ...step2Data,
      {
        document_status: '',
        document_name: '',
        document_id: '',
        invitee_name: '',
        invitee_email: '',
      }
    ]);
  };

  const removeStep2Item = (index) => {
    if (step2Data.length > 1) {
      const newData = step2Data.filter((_, i) => i !== index);
      setStep2Data(newData);
    }
  };


  const handleProceed = async () => {
    if (!execution) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await workflowExecutionsApi.proceedToStep2(execution.id, step1Data);
      
      if (response.data.success) {
        setExecution(response.data.execution);
        setRuleResults(response.data.rule_results || []);
        
        // Update documents with rule-modified data
        if (response.data.updated_documents && Array.isArray(response.data.updated_documents)) {
          setStep2Data(response.data.updated_documents);
        }
      } else {
        setError(response.data.error || 'Failed to proceed to step 2');
        setRuleResults(response.data.rule_results || []);
      }
    } catch (err) {
      if (err.response?.data?.rule_errors) {
        setError(`Rule validation failed: ${err.response.data.rule_errors.join(', ')}`);
        setRuleResults(err.response.data.rule_results || []);
      } else {
        setError('Failed to proceed to step 2');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!execution) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await workflowExecutionsApi.completeWorkflow(execution.id, {
        documents: step2Data
      });
      
      if (response.data.success) {
        setExecution(response.data.execution);
        setRuleResults(response.data.rule_results || []);
        
        // Update documents with rule-modified data
        if (response.data.updated_documents) {
          setStep2Data(response.data.updated_documents);
        }
        
        // Show success message
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to complete workflow');
        setRuleResults(response.data.rule_results || []);
      }
    } catch (err) {
      if (err.response?.data?.rule_errors) {
        setError(`Rule validation failed: ${err.response.data.rule_errors.join(', ')}`);
        setRuleResults(err.response.data.rule_results || []);
      } else {
        setError('Failed to complete workflow');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Step 1: Basic Information
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            name="irn"
            label="IRN"
            value={step1Data.irn}
            onChange={handleStep1Change}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            name="customer_id"
            label="Customer ID"
            value={step1Data.customer_id}
            onChange={handleStep1Change}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            name="stamp_group"
            label="Stamp Group"
            value={step1Data.stamp_group}
            onChange={handleStep1Change}
            fullWidth
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            name="stamp_amount"
            label="Stamp Amount"
            type="number"
            value={step1Data.stamp_amount}
            onChange={handleStep1Change}
            fullWidth
            margin="normal"
            inputProps={{ step: "0.01" }}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep2 = () => (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Step 2: Document Information
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addStep2Item}
          size="small"
        >
          Add Document
        </Button>
      </Box>

      {/* Rule Execution Status */}
      {ruleResults && ruleResults.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No rules found for Step 1 → Step 2 transition
        </Alert>
      )}
      
      {ruleResults && ruleResults.length > 0 && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {ruleResults.length} rule(s) executed
            </Typography>
          }
        >
          <Typography variant="body2">
            <strong>Rule Execution Results:</strong>
          </Typography>
          {ruleResults.map((result, index) => (
            <Box key={index} sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
              <Typography variant="caption" display="block">
                <strong>Rule {index + 1}:</strong> {result.success ? '✅ Success' : '❌ Failed'}
              </Typography>
              {result.result?.assignments && Object.keys(result.result.assignments).length > 0 && (
                <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                  Assignments: {JSON.stringify(result.result.assignments, null, 2)}
                </Typography>
              )}
              {result.result?.errors && result.result.errors.length > 0 && (
                <Typography variant="caption" display="block" color="error">
                  Errors: {result.result.errors.join(', ')}
                </Typography>
              )}
              {result.result?.action_logs && result.result.action_logs.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>Action Calls:</strong>
                  </Typography>
                  {result.result.action_logs.map((actionLog, actionIndex) => (
                    <Box key={actionIndex} sx={{ ml: 2, p: 1, bgcolor: actionLog.status === 'success' ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)', borderRadius: 1, mt: 0.5 }}>
                      <Typography variant="caption" display="block">
                        🔗 <strong>{actionLog.action_name}</strong> from <em>{actionLog.connector_name}</em>
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                        Status: {actionLog.status === 'success' ? '✅ Success' : '❌ Failed'}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        Params: {JSON.stringify(actionLog.params)}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        API Called: {actionLog.api_called ? '✅ Yes' : '❌ No'}
                      </Typography>
                      {actionLog.full_result && (
                        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.05)', p: 0.5, borderRadius: 1, mt: 0.5 }}>
                          <strong>Full API Result:</strong><br/>
                          {JSON.stringify(actionLog.full_result, null, 2)}
                        </Typography>
                      )}
                      {actionLog.status === 'success' && actionLog.response && (
                        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                          Extracted Response: {JSON.stringify(actionLog.response, null, 2)}
                        </Typography>
                      )}
                      {actionLog.status === 'failed' && actionLog.error && (
                        <Typography variant="caption" display="block" color="error">
                          Error: {actionLog.error}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Alert>
      )}
      
      {step2Data.map((item, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Document {index + 1}
            </Typography>
            <IconButton
              onClick={() => removeStep2Item(index)}
              disabled={step2Data.length === 1}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Document Status"
                value={item.document_status}
                onChange={(e) => handleStep2Change(index, 'document_status', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Document Name"
                value={item.document_name}
                onChange={(e) => handleStep2Change(index, 'document_name', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Document ID"
                value={item.document_id}
                onChange={(e) => handleStep2Change(index, 'document_id', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Invitee Name"
                value={item.invitee_name}
                onChange={(e) => handleStep2Change(index, 'invitee_name', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Invitee Email"
                type="email"
                value={item.invitee_email}
                onChange={(e) => handleStep2Change(index, 'invitee_email', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );

  const renderRuleResults = () => {
    if (ruleResults.length === 0) return null;

    return (
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Rule Execution Results ({ruleResults.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {ruleResults.map((result, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {result.success ? (
                  <SuccessIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
                <Typography variant="body2">
                  Rule {index + 1}
                </Typography>
                <Chip 
                  label={`${result.execution_time_ms}ms`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              {result.result?.errors && result.result.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {result.result.errors.join(', ')}
                </Alert>
              )}
              
              {result.result?.warnings && result.result.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {result.result.warnings.join(', ')}
                </Alert>
              )}
              
              {result.result?.assignments && Object.keys(result.result.assignments).length > 0 && (
                <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="caption" display="block">
                    <strong>Assignments:</strong>
                  </Typography>
                  {Object.entries(result.result.assignments).map(([key, value]) => (
                    <Typography key={key} variant="caption" display="block">
                      {key}: {String(value)}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
    );
  };

  if (!workflow) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Execute Workflow: {workflow.name}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {execution?.status === 'completed' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Workflow completed successfully!
          </Alert>
        )}

        <Stepper activeStep={execution?.current_step - 1 || 0} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Basic Information</StepLabel>
          </Step>
          <Step>
            <StepLabel>Document Information</StepLabel>
          </Step>
        </Stepper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {execution?.current_step === 1 && renderStep1()}
            {execution?.current_step === 2 && renderStep2()}
            {renderRuleResults()}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {execution?.status === 'completed' ? 'Close' : 'Cancel'}
        </Button>
        {execution?.current_step === 1 && execution?.status !== 'completed' && (
          <Button 
            onClick={handleProceed} 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Processing...' : 'Proceed'}
          </Button>
        )}
        {execution?.current_step === 2 && execution?.status !== 'completed' && (
          <Button 
            onClick={handleComplete} 
            variant="contained" 
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Completing...' : 'Complete'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowExecutionDialog;