import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { sequenceExecutionsApi } from '../services/api';

const ExecutionRow = ({ execution, onViewDetails }) => {
  const getStatusColor = (status) => {
    const colors = {
      running: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
      cancelled: '#6b7280',
    };
    return colors[status] || '#6b7280';
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

  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Typography variant="body2">{formatDate(execution.started_at)}</Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {execution.sequence_name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ID: {execution.sequence_id}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {execution.execution_id}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={execution.status}
          size="small"
          sx={{
            backgroundColor: `${getStatusColor(execution.status)}20`,
            color: getStatusColor(execution.status),
            fontWeight: 600,
            textTransform: 'capitalize',
          }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2">{execution.event_name || '-'}</Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          {execution.trigger_source || 'N/A'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">{formatDuration(execution.duration_ms)}</Typography>
      </TableCell>
      <TableCell>
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => onViewDetails(execution.execution_id)}
          sx={{ textTransform: 'none' }}
        >
          View Details
        </Button>
      </TableCell>
    </TableRow>
  );
};

const ExecutionLogs = ({ onNavigateToDetails }) => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sequenceExecutionsApi.getAll();
      setExecutions(response.data);
    } catch (err) {
      console.error('Error loading sequence executions:', err);
      setError('Failed to load execution logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter executions
  const filteredExecutions = executions.filter((execution) => {
    const matchesSearch =
      searchTerm === '' ||
      execution.sequence_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      execution.execution_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === '' || execution.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Paginate
  const paginatedExecutions = filteredExecutions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Sequence Execution Logs
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search executions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Started At</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Sequence</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Execution ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Triggered By</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trigger Source</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No execution logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExecutions.map((execution) => (
                    <ExecutionRow
                      key={execution.id}
                      execution={execution}
                      onViewDetails={onNavigateToDetails}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredExecutions.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ExecutionLogs;
