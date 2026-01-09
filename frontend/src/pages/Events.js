import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Alert,
} from '@mui/material';
import notification from '@leegality/leegality-react-component-library/dist/notification';
import {
  Eye,
  Edit2,
  Download,
  Copy,
  Play,
  Trash2,
  FileText,
  Plus,
  Upload,
} from 'react-feather';
import {
  PageHeader,
  Button,
  ButtonTypes,
  Loading,
  Table,
  ColumnTypes,
  RowOverrides,
  Badge,
  BadgeTypes,
  BadgeSizes,
  Toggle,
  ToggleSizes,
  Tooltip,
} from '@leegality/leegality-react-component-library';
import Icon, { IconColors, IconSizes } from '@leegality/leegality-react-component-library/dist/icon';
import { eventsApi } from '../services/api';
import EventForm from '../components/EventForm';
import EventTestModal from '../components/EventTestModal';
import ImportModal from '../components/ImportModal';
import NameConflictDialog from '../components/NameConflictDialog';

// Helper function to create icon renderers for the table
const getRenderIcon = (IconComponent) => IconComponent
  ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} />
  : null;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingEvent, setTestingEvent] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [nameConflictData, setNameConflictData] = useState(null);
  const [importDataCache, setImportDataCache] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await eventsApi.getAll();
      setEvents(response.data);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setShowForm(true);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setShowForm(true);
  };

  const handleView = (event) => {
    setSelectedEvent(event);
    setShowForm(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedEvent) {
        await eventsApi.update(selectedEvent.id, data);
      } else {
        await eventsApi.create(data);
      }
      setShowForm(false);
      loadEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id);
        loadEvents();
      } catch (err) {
        setError('Failed to delete event');
        console.error('Error deleting event:', err);
      }
    }
  };

  const handleCopyEndpoint = (endpoint) => {
    const fullUrl = `${window.location.origin}${endpoint}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      notification.success('Endpoint copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy:', err);
      notification.error('Failed to copy endpoint');
    });
  };

  const handleTest = (event) => {
    setTestingEvent(event);
    setTestModalOpen(true);
  };

  const handleDownloadPayload = async (event) => {
    try {
      const response = await eventsApi.getSamplePayload(event.id);
      const samplePayload = response.data.sample_payload || {};
      const dataStr = JSON.stringify(samplePayload, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sample_payload.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notification.success('Sample payload downloaded successfully!');
    } catch (err) {
      console.error('Failed to download payload:', err);
      notification.error('Failed to download sample payload');
    }
  };

  const handleStatusToggle = async (event) => {
    try {
      await eventsApi.toggleStatus(event.id);
      loadEvents();
      const newStatus = event.status === 'active' ? 'inactive' : 'active';
      notification.success(`Event ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      setError('Failed to update event status');
      console.error('Error updating event status:', err);
    }
  };

  const handleDuplicate = async (event) => {
    try {
      const duplicatedData = {
        name: `${event.name} (Copy)`,
        description: event.description,
        event_type: 'custom',
        event_format: event.event_format,
        parameters: event.parameters,
        acknowledgement_enabled: event.acknowledgement_enabled,
        acknowledgement_type: event.acknowledgement_type,
        acknowledgement_status_code: event.acknowledgement_status_code,
        acknowledgement_payload: event.acknowledgement_payload,
        status: event.status,
      };
      await eventsApi.create(duplicatedData);
      loadEvents();
      notification.success('Event duplicated successfully!');
    } catch (err) {
      setError('Failed to duplicate event');
      console.error('Error duplicating event:', err);
    }
  };

  const handleExport = async (event) => {
    try {
      const response = await eventsApi.export(event.id);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${event.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notification.success('Event exported successfully');
    } catch (err) {
      setError('Failed to export event');
    }
  };

  const handleImport = async (file, overrides = {}) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      setImportDataCache(importData);
      const requestData = {
        ...importData,
        ...overrides
      };
      const response = await eventsApi.import(requestData);
      if (response.data.success) {
        notification.success('Event imported successfully');
        loadEvents();
        setImportDataCache(null);
        setImportModalOpen(false);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;
      if (errorType === 'name_conflict') {
        setNameConflictData({
          data: err.response.data,
          originalData: importDataCache || JSON.parse(await file.text())
        });
        setImportModalOpen(false);
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    }
  };

  const handleConflictResolve = async (newName) => {
    try {
      const requestData = {
        ...importDataCache,
        name_override: newName
      };
      const response = await eventsApi.import(requestData);
      if (response.data.success) {
        notification.success('Event imported successfully');
        loadEvents();
        setImportDataCache(null);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;
      if (errorType === 'name_conflict') {
        setNameConflictData({
          data: err.response.data,
          originalData: importDataCache
        });
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    } finally {
      setNameConflictData(null);
    }
  };

  // Table columns configuration
  const columns = useMemo(() => [
    {
      id: 'name',
      type: ColumnTypes.CUSTOM,
      label: 'Event Name',
      accessor: '_nameDisplay',
      sortable: true,
      width: 250,
    },
    {
      id: 'event_id',
      type: ColumnTypes.CUSTOM,
      label: 'Event ID',
      accessor: '_eventIdDisplay',
      sortable: false,
      width: 180,
    },
    {
      id: 'event_type',
      type: ColumnTypes.CUSTOM,
      label: 'Type',
      accessor: '_typeDisplay',
      sortable: false,
      width: 100,
    },
    {
      id: 'status',
      type: ColumnTypes.CUSTOM,
      label: 'Event Status',
      accessor: '_statusDisplay',
      sortable: false,
      width: 150,
    },
    {
      id: 'endpoint',
      type: ColumnTypes.CUSTOM,
      label: 'Event Endpoint',
      accessor: '_endpointDisplay',
      sortable: false,
      width: 350,
    },
  ], []);

  // Handle clicking on event name (same as View)
  const handleEventNameClick = (event) => {
    handleView(event);
  };

  // Transform events data for the table
  const tableData = useMemo(() => {
    return events.map((event) => ({
      id: event.id.toString(),
      ...event,
      // Name column with description - clickable
      _nameDisplay: (
        <div>
          <div
            style={{
              fontWeight: 500,
              color: '#7f56d9', // primary-600 purple
              cursor: 'pointer',
            }}
            onClick={() => handleEventNameClick(event)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleEventNameClick(event)}
          >
            {event.name}
          </div>
          {event.description && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              {event.description}
            </div>
          )}
        </div>
      ),
      // Event ID with version badge
      _eventIdDisplay: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{event.event_id}</span>
          <Badge
            label={`v${event.version || 1}`}
            type={BadgeTypes.BLUE}
            size={BadgeSizes.SMALL}
          />
        </div>
      ),
      // Type display (plain text)
      _typeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {event.event_type === 'system' ? 'System' : 'Custom'}
        </span>
      ),
      // Status toggle
      _statusDisplay: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Toggle
            checked={event.status === 'active'}
            onChange={() => handleStatusToggle(event)}
            size={ToggleSizes.SMALL}
          />
          <Badge
            label={event.status === 'active' ? 'Active' : 'Inactive'}
            type={event.status === 'active' ? BadgeTypes.SUCCESS : BadgeTypes.GRAY}
            size={BadgeSizes.SMALL}
          />
        </div>
      ),
      // Endpoint with copy button
      _endpointDisplay: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            backgroundColor: '#f5f5f5',
            padding: '4px 8px',
            borderRadius: '4px',
            maxWidth: '280px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {event.webhook_endpoint}
          </span>
          <Tooltip description="Copy endpoint URL">
            <Button
              type={ButtonTypes.TERTIARY}
              renderIcon={getRenderIcon(Copy)}
              onClick={() => handleCopyEndpoint(event.webhook_endpoint)}
              borderLess
            />
          </Tooltip>
        </div>
      ),
      // Row overrides for actions
      [RowOverrides.INVISIBLE_ACTIONS]: event.event_type === 'system' ? ['edit', 'delete'] : [],
    }));
  }, [events]);

  // Action items for the table
  const actionItems = useMemo(() => [
    {
      id: 'view',
      label: 'View',
      renderIcon: getRenderIcon(Eye),
      description: 'View event details',
    },
    {
      id: 'edit',
      label: 'Edit',
      renderIcon: getRenderIcon(Edit2),
      description: 'Edit event',
    },
    {
      id: 'export',
      label: 'Export',
      renderIcon: getRenderIcon(FileText),
      description: 'Export event configuration',
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      renderIcon: getRenderIcon(Copy),
      description: 'Create a copy of this event',
    },
    {
      id: 'download',
      label: 'Download Payload',
      renderIcon: getRenderIcon(Download),
      description: 'Download sample payload format',
    },
    {
      id: 'test',
      label: 'Test Event',
      renderIcon: getRenderIcon(Play),
      description: 'Test this event',
    },
    {
      id: 'delete',
      label: 'Delete',
      renderIcon: getRenderIcon(Trash2),
      description: 'Delete this event',
    },
  ], []);

  // Handle table row actions
  const handleAction = (rowId, actionId) => {
    console.log('handleAction called:', { rowId, actionId });
    const event = events.find(e => e.id.toString() === rowId.toString());
    console.log('Found event:', event);
    if (!event) return;

    switch (actionId) {
      case 'view':
        handleView(event);
        break;
      case 'edit':
        handleEdit(event);
        break;
      case 'export':
        handleExport(event);
        break;
      case 'duplicate':
        handleDuplicate(event);
        break;
      case 'download':
        handleDownloadPayload(event);
        break;
      case 'test':
        handleTest(event);
        break;
      case 'delete':
        handleDelete(event.id);
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  };

  // Button click handler for PageHeader
  const handleHeaderButtonClick = (buttonId) => {
    switch (buttonId) {
      case 'import':
        setImportModalOpen(true);
        break;
      case 'create':
        handleCreate();
        break;
      default:
        break;
    }
  };

  // PageHeader buttons configuration
  const headerButtons = [
    {
      id: 'import',
      label: 'Import',
      title: 'Import event from JSON file',
      type: ButtonTypes.SECONDARY,
      renderIcon: () => <Upload size={20} stroke="currentColor" />,
    },
    {
      id: 'create',
      label: 'Create Event',
      title: 'Create a new event',
      type: ButtonTypes.PRIMARY,
      renderIcon: () => <Plus size={20} stroke="currentColor" />,
    },
  ];

  // Empty state configuration
  const emptyStateProps = {
    text: 'No events found',
    supportingText: 'Create your first event to get started.',
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading events...' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <PageHeader
          text="Events"
          supportingText="Manage webhook events and triggers for your sequences"
          buttons={headerButtons}
          onButtonClick={handleHeaderButtonClick}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        // Fix column gap and action column width issues
        '& .tbl-cont': {
          borderTop: 'none',
          '& table': {
            borderCollapse: 'collapse',
            borderSpacing: 0,
          },
          '& .tbl-th, & .tbl-td': {
            borderRight: 'none',
          },
          // Fix action column width to prevent layout shift on hover
          '& .tbl-row-action-items-cont': {
            minWidth: '130px',
            width: '130px',
            '& .trai-wrapper': {
              '& .tbl-row-action-item:not(.kebab)': {
                // Always display but invisible until hover (prevents layout shift)
                display: 'flex !important',
                opacity: 0,
                pointerEvents: 'none',
              },
            },
          },
          // On row hover, make action items visible and clickable
          '& table tr:hover .tbl-row-action-items-cont .trai-wrapper .tbl-row-action-item:not(.kebab)': {
            opacity: 1,
            pointerEvents: 'auto',
          },
        },
      }}>
        <Table
          columns={columns}
          data={tableData}
          loading={loading}
          actionItems={actionItems}
          maxActions={2}
          onAction={handleAction}
          selectable={false}
          showPagination={false}
          emptyStateProps={emptyStateProps}
        />
      </Box>

      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        event={selectedEvent}
      />

      <EventTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        event={testingEvent}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportDataCache(null);
        }}
        onImport={handleImport}
        title="Import Event"
      />

      <NameConflictDialog
        open={!!nameConflictData}
        onClose={() => {
          setNameConflictData(null);
          setImportDataCache(null);
        }}
        onConfirm={handleConflictResolve}
        conflictData={nameConflictData?.data}
      />
    </Container>
  );
};

export default Events;
