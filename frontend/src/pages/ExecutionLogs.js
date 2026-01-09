import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import {
  Input,
  InputTypes,
  Button,
  ButtonTypes,
  ButtonSizes,
  Table,
  ColumnTypes,
  Badge,
  BadgeTypes,
  BadgeSizes,
  Loading,
  EmptyState,
  DropdownSingleSelect,
  PageHeader,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Eye } from 'react-feather';
import { sequenceExecutionsApi } from '../services/api';

// Icon render helper
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

// Status badge mapping
const getStatusBadgeType = (status) => {
  switch (status) {
    case 'running': return BadgeTypes.PRIMARY;
    case 'completed': return BadgeTypes.SUCCESS;
    case 'failed': return BadgeTypes.ERROR;
    case 'cancelled': return BadgeTypes.DEFAULT;
    default: return BadgeTypes.DEFAULT;
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

// Status filter options
const statusOptions = [
  { id: '', label: 'All Statuses', selected: true },
  { id: 'running', label: 'Running', selected: false },
  { id: 'completed', label: 'Completed', selected: false },
  { id: 'failed', label: 'Failed', selected: false },
  { id: 'cancelled', label: 'Cancelled', selected: false },
];

const ExecutionLogs = ({ onNavigateToDetails }) => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusItems, setStatusItems] = useState(statusOptions);

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

  const handleStatusSelect = (itemId) => {
    setStatusItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        selected: item.id === itemId
      }))
    );
    setStatusFilter(itemId);
  };

  // Filter executions
  const filteredExecutions = useMemo(() => {
    return executions.filter((execution) => {
      const matchesSearch =
        searchTerm === '' ||
        execution.sequence_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        execution.execution_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === '' || execution.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [executions, searchTerm, statusFilter]);

  // Handle table actions
  const handleAction = (rowId, actionId, dataItem) => {
    const execution = executions.find(e => e.id === rowId);
    if (!execution) return;

    if (actionId === 'view') {
      onNavigateToDetails(execution.execution_id);
    }
  };

  // Table action items
  const actionItems = useMemo(() => [
    { id: 'view', label: 'View Details', renderIcon: getRenderIcon(Eye), tooltipProps: { description: 'View execution details' } },
  ], []);

  // Table columns
  const columns = useMemo(() => [
    {
      id: 'sequence_name',
      label: 'Sequence',
      accessor: '_sequenceDisplay',
      type: ColumnTypes.CUSTOM,
      width: 200,
    },
    {
      id: 'started_at',
      label: 'Started At',
      accessor: '_startedAtDisplay',
      type: ColumnTypes.CUSTOM,
      width: 180,
    },
    {
      id: 'execution_id',
      label: 'Execution ID',
      accessor: '_executionIdDisplay',
      type: ColumnTypes.CUSTOM,
      width: 250,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: '_statusBadge',
      type: ColumnTypes.BADGE,
      width: 120,
    },
    {
      id: 'event_name',
      label: 'Triggered By',
      accessor: '_triggeredByDisplay',
      type: ColumnTypes.CUSTOM,
      width: 150,
    },
    {
      id: 'duration_ms',
      label: 'Duration',
      accessor: '_durationDisplay',
      type: ColumnTypes.CUSTOM,
      width: 100,
    },
  ], []);

  // Handle clicking on execution - navigate to details
  const handleExecutionClick = useCallback((execution) => {
    onNavigateToDetails(execution.execution_id);
  }, [onNavigateToDetails]);

  // Transform data for table
  const tableData = useMemo(() => {
    return filteredExecutions.map(execution => ({
      id: execution.id.toString(),
      ...execution,
      // Started at display with trigger source
      _startedAtDisplay: (
        <div>
          <div style={{ fontSize: '13px', color: '#344054', whiteSpace: 'nowrap' }}>
            {formatDate(execution.started_at)}
          </div>
          <div style={{ fontSize: '11px', color: '#667085' }}>
            {execution.trigger_source || 'N/A'}
          </div>
        </div>
      ),
      // Sequence display - clickable purple text
      _sequenceDisplay: (
        <div>
          <div
            style={{
              fontWeight: 500,
              color: '#7f56d9',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onClick={() => handleExecutionClick(execution)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleExecutionClick(execution)}
          >
            {execution.sequence_name}
          </div>
          <div style={{ fontSize: '11px', color: '#667085' }}>ID: {execution.sequence_id}</div>
        </div>
      ),
      // Execution ID display
      _executionIdDisplay: (
        <code style={{ fontSize: '11px', color: '#344054', backgroundColor: '#F9FAFB', padding: '2px 6px', borderRadius: '4px' }}>
          {execution.execution_id}
        </code>
      ),
      // Status badge
      _statusBadge: {
        label: execution.status ? execution.status.charAt(0).toUpperCase() + execution.status.slice(1) : 'N/A',
        type: getStatusBadgeType(execution.status),
        size: BadgeSizes.SMALL,
      },
      // Triggered by display
      _triggeredByDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>{execution.event_name || '-'}</span>
      ),
      // Duration display
      _durationDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>{formatDuration(execution.duration_ms)}</span>
      ),
    }));
  }, [filteredExecutions, handleExecutionClick]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading execution logs...' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <PageHeader
          text="Sequence Execution Logs"
          supportingText="View and monitor sequence execution history"
        />
      </Box>

      {/* Error Banner */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Banner
            type={BannerTypes.ERROR}
            size={BannerSizes.SMALL}
            message={error}
            onClose={() => setError(null)}
          />
        </Box>
      )}

      {/* Filters */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        mb: 2,
        alignItems: 'center',
      }}>
        <Box sx={{ width: '300px', '& > div': { marginBottom: 0 } }}>
          <Input
            type={InputTypes.TEXT}
            placeholder="Search executions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
        <Box className="filter-dropdown">
          <DropdownSingleSelect
            items={statusItems}
            onSelect={handleStatusSelect}
            placeholder="Status"
          />
        </Box>
      </Box>

      {/* Execution Logs Table */}
      <Box sx={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        '& .tbl-cont': {
          borderTop: 'none',
          '& table': {
            borderCollapse: 'collapse',
            borderSpacing: 0,
          },
          '& .tbl-th, & .tbl-td': {
            borderRight: 'none',
          },
          '& .tbl-row-action-items-cont': {
            minWidth: '80px',
            width: '80px',
            '& .trai-wrapper': {
              '& .tbl-row-action-item:not(.kebab)': {
                display: 'flex !important',
                opacity: 0,
                pointerEvents: 'none',
              },
            },
          },
          '& table tr:hover .tbl-row-action-items-cont .trai-wrapper .tbl-row-action-item:not(.kebab)': {
            opacity: 1,
            pointerEvents: 'auto',
          },
        },
      }}>
        {tableData.length === 0 ? (
          <EmptyState
            header="No execution logs found"
            description={searchTerm || statusFilter
              ? "Try adjusting your filters to find what you're looking for"
              : "Execution logs will appear here once sequences are run"}
          />
        ) : (
          <Table
            columns={columns}
            data={tableData}
            actionItems={actionItems}
            maxActions={1}
            onAction={handleAction}
            selectable={false}
            showPagination={true}
            paginationConfig={{
              rowsPerPage: 25,
              rowsPerPageOptions: [10, 25, 50, 100],
            }}
          />
        )}
      </Box>
    </Container>
  );
};

export default ExecutionLogs;
