import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
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
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const ApiCallLogViewer = ({ workflowExecutionId = null, workflowRuleId = null, open = true, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    action_name: '',
    connector_name: '',
  });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workflowExecutionId) params.append('workflow_execution_id', workflowExecutionId);
      if (workflowRuleId) params.append('workflow_rule_id', workflowRuleId);
      if (filters.status) params.append('status', filters.status);
      if (filters.action_name) params.append('action_name', filters.action_name);
      if (filters.connector_name) params.append('connector_name', filters.connector_name);
      
      const response = await fetch(`http://localhost:8001/api/api-call-logs/?${params}`);
      const data = await response.json();
      
      // Handle both paginated response (data.results) and direct array response
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (data.results && Array.isArray(data.results)) {
        setLogs(data.results);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to fetch API call logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (workflowExecutionId) params.append('workflow_execution_id', workflowExecutionId);
      if (workflowRuleId) params.append('workflow_rule_id', workflowRuleId);
      
      const response = await fetch(`http://localhost:8001/api/api-call-logs/stats/?${params}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch API call stats:', error);
    }
  };

  const fetchLogDetail = async (logId) => {
    try {
      const response = await fetch(`http://localhost:8001/api/api-call-logs/${logId}/`);
      const data = await response.json();
      setSelectedLog(data);
      setDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch log details:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
      fetchStats();
    }
  }, [open, workflowExecutionId, workflowRuleId, filters]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'validation_error': return 'warning';
      case 'timeout': return 'info';
      case 'network_error': return 'error';
      case 'not_found': return 'secondary';
      default: return 'default';
    }
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return 'N/A';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const toggleRowExpanded = (logId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const renderStatsCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Calls
            </Typography>
            <Typography variant="h5">
              {stats.total_calls || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Success Rate
            </Typography>
            <Typography variant="h5" color={stats.success_rate >= 90 ? 'success.main' : stats.success_rate >= 70 ? 'warning.main' : 'error.main'}>
              {stats.success_rate || 0}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Failed Calls
            </Typography>
            <Typography variant="h5" color="error">
              {stats.failed_calls || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Avg Duration
            </Typography>
            <Typography variant="h5">
              {stats.average_duration_ms ? formatDuration(stats.average_duration_ms) : 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="validation_error">Validation Error</MenuItem>
              <MenuItem value="timeout">Timeout</MenuItem>
              <MenuItem value="network_error">Network Error</MenuItem>
              <MenuItem value="not_found">Not Found</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            size="small"
            label="Action Name"
            value={filters.action_name}
            onChange={(e) => setFilters(prev => ({ ...prev, action_name: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            size="small"
            label="Connector Name"
            value={filters.connector_name}
            onChange={(e) => setFilters(prev => ({ ...prev, connector_name: e.target.value }))}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { fetchLogs(); fetchStats(); }}
            disabled={loading}
          >
            Refresh
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  const renderLogsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Connector</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>HTTP Code</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <React.Fragment key={log.id}>
              <TableRow>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => toggleRowExpanded(log.id)}
                  >
                    {expandedRows.has(log.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>{log.action_name}</TableCell>
                <TableCell>{log.connector_name}</TableCell>
                <TableCell>
                  <Chip
                    label={log.status}
                    color={getStatusColor(log.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{log.http_status_code || 'N/A'}</TableCell>
                <TableCell>{formatDuration(log.duration_ms)}</TableCell>
                <TableCell>{formatTimestamp(log.created_at)}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => fetchLogDetail(log.id)}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                  <Collapse in={expandedRows.has(log.id)} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                      <Typography variant="h6" gutterBottom component="div">
                        Quick Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">URL:</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {log.endpoint_url}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2">Method:</Typography>
                          <Typography variant="body2">{log.http_method}</Typography>
                        </Grid>
                        {log.error_message && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">Error:</Typography>
                            <Typography variant="body2" color="error">
                              {log.error_message}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        API Call Logs
        {workflowExecutionId && ` - Execution #${workflowExecutionId}`}
        {workflowRuleId && ` - Rule #${workflowRuleId}`}
      </DialogTitle>
      <DialogContent>
        {renderStatsCards()}
        {renderFilters()}
        <Divider sx={{ my: 2 }} />
        {loading ? (
          <Typography>Loading...</Typography>
        ) : logs.length === 0 ? (
          <Typography>No API calls found.</Typography>
        ) : (
          renderLogsTable()
        )}

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>API Call Details</DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                  <Tab label="Overview" />
                  <Tab label="Request" />
                  <Tab label="Response" />
                </Tabs>
                
                {tabValue === 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Action:</Typography>
                        <Typography>{selectedLog.action_name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Connector:</Typography>
                        <Typography>{selectedLog.connector_name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Status:</Typography>
                        <Chip label={selectedLog.status} color={getStatusColor(selectedLog.status)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Duration:</Typography>
                        <Typography>{formatDuration(selectedLog.duration_ms)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">URL:</Typography>
                        <Typography sx={{ wordBreak: 'break-all' }}>{selectedLog.endpoint_url}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
                
                {tabValue === 1 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6">Request Details</Typography>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Headers:</Typography>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                      {JSON.stringify(selectedLog.request_headers, null, 2)}
                    </pre>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Parameters:</Typography>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                      {JSON.stringify(selectedLog.request_params, null, 2)}
                    </pre>
                    {selectedLog.request_body && Object.keys(selectedLog.request_body).length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>Body:</Typography>
                        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                          {JSON.stringify(selectedLog.request_body, null, 2)}
                        </pre>
                      </>
                    )}
                  </Box>
                )}
                
                {tabValue === 2 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6">Response Details</Typography>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Status Code:</Typography>
                    <Typography>{selectedLog.http_status_code || 'N/A'}</Typography>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Headers:</Typography>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                      {JSON.stringify(selectedLog.response_headers, null, 2)}
                    </pre>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Body:</Typography>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
                      {JSON.stringify(selectedLog.response_body, null, 2)}
                    </pre>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiCallLogViewer;