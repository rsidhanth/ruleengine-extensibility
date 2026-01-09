import React, { useState, useEffect, useMemo } from 'react';
import { Box, Container } from '@mui/material';
import {
  Input,
  InputTypes,
  Table,
  ColumnTypes,
  Loading,
  EmptyState,
  DropdownSingleSelect,
  PageHeader,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import { activityLogsApi } from '../services/api';

const formatDate = (dateString) => {
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

// Entity type filter options
const entityTypeOptions = [
  { id: '', label: 'All Entity Types', selected: true },
  { id: 'connector', label: 'Connector', selected: false },
  { id: 'credential', label: 'Credential', selected: false },
  { id: 'action', label: 'Action', selected: false },
  { id: 'event', label: 'Event', selected: false },
  { id: 'sequence', label: 'Sequence', selected: false },
];

// Action type filter options
const actionTypeOptions = [
  { id: '', label: 'All Actions', selected: true },
  { id: 'created', label: 'Created', selected: false },
  { id: 'updated', label: 'Updated', selected: false },
  { id: 'deleted', label: 'Deleted', selected: false },
  { id: 'activated', label: 'Activated', selected: false },
  { id: 'deactivated', label: 'Deactivated', selected: false },
];

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [entityTypeItems, setEntityTypeItems] = useState(entityTypeOptions);
  const [actionTypeItems, setActionTypeItems] = useState(actionTypeOptions);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await activityLogsApi.getAll();
      setLogs(response.data);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setError('Failed to load activity logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEntityTypeSelect = (itemId) => {
    setEntityTypeItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        selected: item.id === itemId
      }))
    );
    setEntityTypeFilter(itemId);
  };

  const handleActionTypeSelect = (itemId) => {
    setActionTypeItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        selected: item.id === itemId
      }))
    );
    setActionTypeFilter(itemId);
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === '' ||
        log.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEntityType = entityTypeFilter === '' || log.entity_type === entityTypeFilter;
      const matchesActionType = actionTypeFilter === '' || log.action_type === actionTypeFilter;

      return matchesSearch && matchesEntityType && matchesActionType;
    });
  }, [logs, searchTerm, entityTypeFilter, actionTypeFilter]);

  // Table columns
  const columns = useMemo(() => [
    {
      id: 'created_at',
      label: 'Timestamp',
      accessor: '_timestampDisplay',
      type: ColumnTypes.CUSTOM,
      width: 180,
    },
    {
      id: 'user_email',
      label: 'User',
      accessor: '_userDisplay',
      type: ColumnTypes.CUSTOM,
      width: 200,
    },
    {
      id: 'entity_type',
      label: 'Entity Type',
      accessor: '_entityTypeDisplay',
      type: ColumnTypes.CUSTOM,
      width: 120,
    },
    {
      id: 'action_type',
      label: 'Action',
      accessor: '_actionTypeDisplay',
      type: ColumnTypes.CUSTOM,
      width: 120,
    },
    {
      id: 'message',
      label: 'Message',
      accessor: '_messageDisplay',
      type: ColumnTypes.CUSTOM,
      width: 350,
    },
  ], []);

  // Transform data for table
  const tableData = useMemo(() => {
    return filteredLogs.map(log => ({
      id: log.id.toString(),
      ...log,
      // Timestamp display
      _timestampDisplay: (
        <span style={{ fontSize: '13px', color: '#344054', whiteSpace: 'nowrap' }}>
          {formatDate(log.created_at)}
        </span>
      ),
      // User display
      _userDisplay: (
        <div>
          <div style={{ fontWeight: 500, color: '#101828', fontSize: '14px' }}>
            {log.user_email || 'abc@company.com'}
          </div>
          <div style={{ fontSize: '12px', color: '#667085' }}>
            {log.user_info || 'N/A'}
          </div>
        </div>
      ),
      // Entity type display (plain text)
      _entityTypeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {log.entity_type ? log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1) : 'N/A'}
        </span>
      ),
      // Action type display (plain text)
      _actionTypeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {log.action_type ? log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1) : 'N/A'}
        </span>
      ),
      // Message display
      _messageDisplay: (
        <span style={{ fontSize: '14px', color: '#667085', maxWidth: '400px', display: 'block' }}>
          {log.message}
        </span>
      ),
    }));
  }, [filteredLogs]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading activity logs...' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <PageHeader
          text="Activity Logs"
          supportingText="View system activity and audit trail"
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
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
        <Box className="filter-dropdown">
          <DropdownSingleSelect
            items={entityTypeItems}
            onSelect={handleEntityTypeSelect}
            placeholder="Entity Type"
          />
        </Box>
        <Box className="filter-dropdown">
          <DropdownSingleSelect
            items={actionTypeItems}
            onSelect={handleActionTypeSelect}
            placeholder="Action Type"
          />
        </Box>
      </Box>

      {/* Activity Logs Table */}
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
        },
      }}>
        {tableData.length === 0 ? (
          <EmptyState
            header="No activity logs found"
            description={searchTerm || entityTypeFilter || actionTypeFilter
              ? "Try adjusting your filters to find what you're looking for"
              : "Activity logs will appear here once actions are performed"}
          />
        ) : (
          <Table
            columns={columns}
            data={tableData}
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

export default ActivityLogs;
