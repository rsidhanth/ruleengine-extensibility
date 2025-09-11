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
  Chip,
  IconButton,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';

const AsyncExecutionViewer = ({ open, onClose, workflowExecutionId = null }) => {
  const [executions, setExecutions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    action_id: '',
  });

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workflowExecutionId) params.append('workflow_execution_id', workflowExecutionId);
      if (filters.status) params.append('status', filters.status);
      if (filters.action_id) params.append('action_id', filters.action_id);
      
      const response = await fetch(`http://localhost:8001/api/async-executions/?${params}`);
      const data = await response.json();
      setExecutions(data.results || data);
    } catch (error) {
      console.error('Failed to fetch async executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (workflowExecutionId) params.append('workflow_execution_id', workflowExecutionId);
      
      const response = await fetch(`http://localhost:8001/api/async-executions/stats/?${params}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch async execution stats:', error);
    }
  };

  const fetchExecutionDetail = async (executionId) => {
    try {
      const response = await fetch(`http://localhost:8001/api/async-executions/${executionId}/status/`);
      const data = await response.json();
      setSelectedExecution(data);
      setDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch execution details:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchExecutions();
      fetchStats();
    }
  }, [open, workflowExecutionId, filters]);

  // Auto-refresh for polling executions
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      // Only refresh if there are active polling executions
      const hasActiveExecutions = executions.some(ex => ex.status === 'polling' || ex.status === 'initiated');
      if (hasActiveExecutions) {
        fetchExecutions();
        fetchStats();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [open, executions]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'timeout': return 'warning';
      case 'polling': return 'info';
      case 'initiated': return 'primary';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CompletedIcon />;
      case 'failed': return <ErrorIcon />;
      case 'timeout': return <ErrorIcon />;
      case 'polling': return <ScheduleIcon />;
      case 'initiated': return <PendingIcon />;
      default: return <PendingIcon />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const duration = new Date(endTime) - new Date(startTime);
    return `${Math.round(duration / 1000)}s`;
  };

  const renderStatsCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total
            </Typography>
            <Typography variant="h5">
              {stats.total_executions || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Completed
            </Typography>
            <Typography variant="h5" color="success.main">
              {stats.completed || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Failed
            </Typography>
            <Typography variant="h5" color="error.main">
              {stats.failed || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Polling
            </Typography>
            <Typography variant="h5" color="info.main">
              {stats.polling || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Timeout
            </Typography>
            <Typography variant="h5" color="warning.main">
              {stats.timeout || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Success Rate
            </Typography>
            <Typography 
              variant="h5" 
              color={stats.success_rate >= 90 ? 'success.main' : stats.success_rate >= 70 ? 'warning.main' : 'error.main'}
            >
              {stats.success_rate || 0}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={filters.status}
            label="Status Filter"
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="initiated">Initiated</MenuItem>
            <MenuItem value="polling">Polling</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="timeout">Timeout</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          size="small"
          label="Action ID"
          value={filters.action_id}
          onChange={(e) => setFilters(prev => ({ ...prev, action_id: e.target.value }))}
          placeholder="Filter by action ID"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => { fetchExecutions(); fetchStats(); }}
          disabled={loading}
          fullWidth
        >
          Refresh
        </Button>
      </Grid>
    </Grid>
  );

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          Async Action Executions
          {workflowExecutionId && ` - Workflow #${workflowExecutionId}`}
        </DialogTitle>
        <DialogContent>
          {renderStatsCards()}
          {renderFilters()}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : executions.length === 0 ? (
            <Alert severity="info">
              No async executions found. Async executions will appear here when actions with type 'async' are executed.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Execution ID</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Connector</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Polling Attempts</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {execution.execution_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{execution.action_name}</TableCell>
                      <TableCell>{execution.connector_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={execution.async_type || 'N/A'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(execution.status)}
                          label={execution.status}
                          color={getStatusColor(execution.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {execution.polling_attempts || 0}
                      </TableCell>
                      <TableCell>
                        {formatDuration(execution.initial_called_at, execution.completed_at)}
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(execution.created_at)}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => fetchExecutionDetail(execution.id)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Execution Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Async Execution Details</DialogTitle>
        <DialogContent>
          {selectedExecution && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Execution ID:</Typography>
                  <Typography sx={{ fontFamily: 'monospace' }}>{selectedExecution.execution_id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip 
                    icon={getStatusIcon(selectedExecution.status)} 
                    label={selectedExecution.status} 
                    color={getStatusColor(selectedExecution.status)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Polling Attempts:</Typography>
                  <Typography>{selectedExecution.polling_attempts || 0}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Created At:</Typography>
                  <Typography>{formatTimestamp(selectedExecution.created_at)}</Typography>
                </Grid>
              </Grid>

              {selectedExecution.error_message && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Error:</Typography>
                  {selectedExecution.error_message}
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>
                Initial Response:
              </Typography>
              <TextField
                value={JSON.stringify(selectedExecution.initial_response, null, 2)}
                fullWidth
                multiline
                rows={6}
                variant="outlined"
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}
              />

              {selectedExecution.last_polling_response && Object.keys(selectedExecution.last_polling_response).length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Last Polling Response:
                  </Typography>
                  <TextField
                    value={JSON.stringify(selectedExecution.last_polling_response, null, 2)}
                    fullWidth
                    multiline
                    rows={6}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}
                  />
                </>
              )}

              {selectedExecution.final_response && Object.keys(selectedExecution.final_response).length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Final Response:
                  </Typography>
                  <TextField
                    value={JSON.stringify(selectedExecution.final_response, null, 2)}
                    fullWidth
                    multiline
                    rows={6}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AsyncExecutionViewer;