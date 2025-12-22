import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Alert,
  Button,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import { sequencesApi } from '../services/api';

const SequenceTestModal = ({ open, onClose, sequence }) => {
  const [testInfo, setTestInfo] = useState(null);
  const [executionStatus, setExecutionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (open && sequence) {
      console.log('SequenceTestModal - Received sequence object:', sequence);
      console.log('SequenceTestModal - sequence.id:', sequence.id);
      console.log('SequenceTestModal - sequence.sequence_id:', sequence.sequence_id);
      loadTestInfo();
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [open, sequence]);

  const loadTestInfo = async () => {
    try {
      console.log('SequenceTestModal - Calling getTestInfo with ID:', sequence.id);
      const response = await sequencesApi.getTestInfo(sequence.id);
      console.log('SequenceTestModal - getTestInfo response:', response.data);
      setTestInfo(response.data);
    } catch (err) {
      console.error('SequenceTestModal - Error loading test info:', err);
      console.error('SequenceTestModal - Error response:', err.response);
      setError('Failed to load test information');
    }
  };

  const loadExecutionStatus = async () => {
    setLoading(true);
    try {
      const response = await sequencesApi.getTestStatus(sequence.id);
      setExecutionStatus(response.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        // No execution yet, this is expected
        setExecutionStatus(null);
      } else {
        console.error('Error loading execution status:', err);
        setError('Failed to load execution status');
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    // Load immediately
    loadExecutionStatus();

    // Then poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      loadExecutionStatus();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleCopyEndpoint = (endpoint) => {
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    stopPolling();
    setExecutionStatus(null);
    setTestInfo(null);
    setError('');
    onClose();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '85vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Test Sequence: {sequence?.name}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 1: Trigger Event Endpoints */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Step 1" color="primary" size="small" />
            Trigger Event Endpoints
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a POST request to any of the following event endpoints to trigger the sequence
          </Typography>

          {testInfo?.trigger_events?.length > 0 ? (
            testInfo.trigger_events.map((event, index) => (
              <Box key={event.event_id} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Event: {event.event_name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      flex: 1,
                      backgroundColor: 'white',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {event.test_endpoint}
                  </Paper>
                  <IconButton
                    onClick={() => handleCopyEndpoint(event.test_endpoint)}
                    color={copied ? 'success' : 'default'}
                    size="small"
                  >
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Box>
            ))
          ) : (
            <Alert severity="warning">
              No trigger events configured for this sequence. Please configure trigger events in the sequence builder.
            </Alert>
          )}
        </Paper>

        <Divider sx={{ my: 2 }}>
          <Chip label="Execution Status" size="small" />
        </Divider>

        {/* Step 2: Execution Status */}
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {executionStatus ? 'Sequence Execution Details' : 'Waiting for event trigger...'}
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          {executionStatus ? (
            <Box>
              {/* Execution Summary */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(executionStatus.status)}
                    <Typography variant="h6">
                      Status: <Chip
                        label={executionStatus.status.toUpperCase()}
                        color={getStatusColor(executionStatus.status)}
                        size="small"
                      />
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Execution ID: {executionStatus.execution_id}
                  </Typography>
                </Box>

                {executionStatus.status === 'running' && (
                  <LinearProgress color="info" sx={{ mb: 2 }} />
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Started At</Typography>
                    <Typography variant="body2">
                      {new Date(executionStatus.started_at).toLocaleString()}
                    </Typography>
                  </Box>
                  {executionStatus.completed_at && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Completed At</Typography>
                      <Typography variant="body2">
                        {new Date(executionStatus.completed_at).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {executionStatus.duration_ms && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Duration</Typography>
                      <Typography variant="body2">
                        {executionStatus.duration_ms}ms
                      </Typography>
                    </Box>
                  )}
                  {executionStatus.trigger_event && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Triggered By</Typography>
                      <Typography variant="body2">
                        {executionStatus.trigger_event}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {executionStatus.error_message && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {executionStatus.error_message}
                  </Alert>
                )}
              </Paper>

              {/* Trigger Payload */}
              {executionStatus.trigger_payload && Object.keys(executionStatus.trigger_payload).length > 0 && (
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Trigger Payload</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        backgroundColor: '#1e1e1e',
                        color: '#d4d4d4',
                        maxHeight: '300px',
                        overflow: 'auto'
                      }}
                    >
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {JSON.stringify(executionStatus.trigger_payload, null, 2)}
                      </Typography>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Execution Logs - Node by Node */}
              {executionStatus.execution_logs && executionStatus.execution_logs.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Execution Steps ({executionStatus.execution_logs.length})
                  </Typography>
                  <Stepper orientation="vertical">
                    {executionStatus.execution_logs.map((log, index) => (
                      <Step key={log.id} active={true} completed={log.status === 'completed'}>
                        <StepLabel
                          error={log.status === 'failed'}
                          icon={
                            log.status === 'completed' ? (
                              <CheckCircleIcon color="success" />
                            ) : log.status === 'failed' ? (
                              <ErrorIcon color="error" />
                            ) : (
                              index + 1
                            )
                          }
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {log.node_name}
                            </Typography>
                            <Chip
                              label={log.node_type}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                            <Chip
                              label={log.log_level}
                              size="small"
                              color={getLogLevelColor(log.log_level)}
                              sx={{ fontSize: '0.7rem' }}
                            />
                            {log.duration_ms && (
                              <Typography variant="caption" color="text.secondary">
                                {log.duration_ms}ms
                              </Typography>
                            )}
                          </Box>
                        </StepLabel>
                        <StepContent>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {log.message}
                          </Typography>

                          {/* Input/Output Accordions */}
                          {log.output_data && Object.keys(log.output_data).length > 0 && (
                            <Accordion sx={{ mt: 1 }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="caption">Output Data</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Paper
                                  variant="outlined"
                                  sx={{
                                    p: 1.5,
                                    backgroundColor: '#1e1e1e',
                                    color: '#d4d4d4',
                                    maxHeight: '200px',
                                    overflow: 'auto'
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{
                                      fontFamily: 'monospace',
                                      margin: 0,
                                      fontSize: '0.75rem',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {JSON.stringify(log.output_data, null, 2)}
                                  </Typography>
                                </Paper>
                              </AccordionDetails>
                            </Accordion>
                          )}
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </Paper>
              )}

              {/* Final Output */}
              {executionStatus.final_output && Object.keys(executionStatus.final_output).length > 0 && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Final Output</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        backgroundColor: '#1e1e1e',
                        color: '#d4d4d4',
                        maxHeight: '300px',
                        overflow: 'auto'
                      }}
                    >
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {JSON.stringify(executionStatus.final_output, null, 2)}
                      </Typography>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
              }}
            >
              <PendingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No execution found yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Trigger one of the event endpoints above to start the sequence execution
              </Typography>
              {loading && (
                <Box sx={{ mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Paper>
          )}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadExecutionStatus}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SequenceTestModal;
