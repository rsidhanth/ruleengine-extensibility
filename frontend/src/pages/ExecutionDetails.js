import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { sequenceExecutionsApi, executionLogsApi } from '../services/api';

const ExecutionDetails = ({ executionId, onBack }) => {
  const [execution, setExecution] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExecutionDetails();
  }, [executionId]);

  const loadExecutionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load execution details - need to get all executions to find the one with matching execution_id
      const executionsResponse = await sequenceExecutionsApi.getAll();
      const foundExecution = executionsResponse.data.find(
        (e) => e.execution_id === executionId
      );

      if (!foundExecution) {
        setError('Execution not found');
        setLoading(false);
        return;
      }

      setExecution(foundExecution);

      console.log('Loading logs for execution ID:', foundExecution.id, 'execution_id:', foundExecution.execution_id);

      // Load execution logs for THIS specific execution only using the database ID
      const logsResponse = await executionLogsApi.getAll({
        sequence_execution: foundExecution.id,
      });

      console.log('Received logs:', logsResponse.data.length, 'logs');
      console.log('All logs:', logsResponse.data.map(l => ({ id: l.id, sequence_execution: l.sequence_execution, node: l.node_name })));

      // Additional filter to ensure we only get logs for this specific execution
      // (in case the API doesn't filter properly)
      const filteredLogs = logsResponse.data.filter(
        (log) => log.sequence_execution === foundExecution.id
      );

      console.log('After filtering:', filteredLogs.length, 'logs remain');

      setLogs(filteredLogs);
    } catch (err) {
      console.error('Error loading execution details:', err);
      setError('Failed to load execution details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      running: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
      cancelled: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: '1.2rem', color: '#10b981' }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: '1.2rem', color: '#ef4444' }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: '1.2rem', color: '#f59e0b' }} />;
      default:
        return <InfoIcon sx={{ fontSize: '1.2rem', color: '#3b82f6' }} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatJSON = (data) => {
    if (!data) return 'N/A';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  const renderActionDetails = (log) => {
    const outputData = log.output_data || {};
    const requestDetails = outputData.request_details || {};
    const inputData = log.input_data || {};

    return (
      <Box sx={{ mt: 2 }}>
        {/* Request Details */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Request Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: '20%' }}>Method</TableCell>
                    <TableCell>{requestDetails.method || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>URL</TableCell>
                    <TableCell sx={{ wordBreak: 'break-all' }}>
                      {requestDetails.url || outputData.url || 'N/A'}
                    </TableCell>
                  </TableRow>
                  {requestDetails.headers && Object.keys(requestDetails.headers).length > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                        Headers
                      </TableCell>
                      <TableCell>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {formatJSON(requestDetails.headers)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                  {requestDetails.params && Object.keys(requestDetails.params).length > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                        Query Params
                      </TableCell>
                      <TableCell>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {formatJSON(requestDetails.params)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                  {requestDetails.body && Object.keys(requestDetails.body).length > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                        Request Body
                      </TableCell>
                      <TableCell>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {formatJSON(requestDetails.body)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Response Details */}
        <Accordion defaultExpanded sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Response Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: '20%' }}>Status Code</TableCell>
                    <TableCell>
                      <Chip
                        label={outputData.status_code || 'N/A'}
                        size="small"
                        color={
                          outputData.status_code >= 200 && outputData.status_code < 300
                            ? 'success'
                            : 'error'
                        }
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Response Time</TableCell>
                    <TableCell>{formatDuration(outputData.response_time_ms)}</TableCell>
                  </TableRow>
                  {outputData.headers && Object.keys(outputData.headers).length > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                        Response Headers
                      </TableCell>
                      <TableCell>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {formatJSON(outputData.headers)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                  {outputData.body && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                        Response Body
                      </TableCell>
                      <TableCell>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            maxHeight: '400px',
                            overflow: 'auto',
                          }}
                        >
                          {formatJSON(outputData.body)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                  {outputData.error_message && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>
                        Error Message
                      </TableCell>
                      <TableCell>
                        <Typography color="error">{outputData.error_message}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Input Configuration */}
        {inputData.actionConfig && (
          <Accordion sx={{ mt: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Node Configuration
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                }}
              >
                {formatJSON(inputData)}
              </pre>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  const renderCustomRuleDetails = (log) => {
    const outputData = log.output_data || {};
    const inputData = log.input_data || {};
    const customRuleConfig = inputData.customRuleConfig || {};

    return (
      <Box sx={{ mt: 2 }}>
        {customRuleConfig.code && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                DSL Code
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                }}
              >
                {customRuleConfig.code}
              </pre>
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion defaultExpanded sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Execution Result
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              }}
            >
              {formatJSON(outputData)}
            </pre>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const renderConditionDetails = (log) => {
    const outputData = log.output_data || {};
    const inputData = log.input_data || {};

    return (
      <Box sx={{ mt: 2 }}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Condition Configuration
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              }}
            >
              {formatJSON(inputData.conditionSets || inputData.condition)}
            </pre>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Evaluation Result
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Condition evaluated to: <strong>{outputData.result ? 'TRUE' : 'FALSE'}</strong>
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const renderNodeDetails = (log) => {
    switch (log.node_type) {
      case 'action':
        return renderActionDetails(log);
      case 'custom_rule':
        return renderCustomRuleDetails(log);
      case 'condition':
        return renderConditionDetails(log);
      default:
        return (
          <Box sx={{ mt: 2 }}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Output Data
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                >
                  {formatJSON(log.output_data)}
                </pre>
              </AccordionDetails>
            </Accordion>
          </Box>
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!execution) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Execution not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Execution Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {execution.sequence_name} - {execution.execution_id}
          </Typography>
        </Box>
        <Chip
          label={execution.status}
          sx={{
            backgroundColor: `${getStatusColor(execution.status)}20`,
            color: getStatusColor(execution.status),
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        />
      </Box>

      {/* Execution Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Execution Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Sequence
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {execution.sequence_name}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Execution ID
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {execution.execution_id}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Started At
            </Typography>
            <Typography variant="body1">{formatDate(execution.started_at)}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body1">{formatDuration(execution.duration_ms)}</Typography>
          </Grid>
          {execution.event_name && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Triggered By
              </Typography>
              <Typography variant="body1">{execution.event_name}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Node Execution Logs */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Node Execution Logs
      </Typography>
      {logs.length === 0 ? (
        <Alert severity="info">No execution logs available</Alert>
      ) : (
        logs.map((log, index) => (
          <Card key={log.id} sx={{ mb: 2 }}>
            <CardContent>
              {/* Node Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2 }}>{getLogLevelIcon(log.log_level)}</Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    {log.node_name || log.node_id}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={log.node_type}
                      size="small"
                      sx={{ fontSize: '0.7rem', height: '22px' }}
                    />
                    <Chip
                      label={log.status}
                      size="small"
                      color={log.status === 'completed' ? 'success' : 'error'}
                      sx={{ fontSize: '0.7rem', height: '22px' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDuration(log.duration_ms)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Message */}
              <Typography variant="body2" sx={{ mb: 2 }}>
                {log.message}
              </Typography>

              {/* Detailed logs based on node type */}
              {renderNodeDetails(log)}
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default ExecutionDetails;
