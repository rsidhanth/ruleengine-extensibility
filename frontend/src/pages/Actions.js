import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import {
  Button,
  ButtonTypes,
  ButtonSizes,
  Table,
  ColumnTypes,
  RowOverrides,
  Toggle,
  ToggleSizes,
  Badge,
  BadgeTypes,
  BadgeSizes,
  Loading,
  EmptyState,
  Tooltip,
  PageHeader,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Edit2, Trash2, Play, Plus, ArrowLeft } from 'react-feather';
import { actionsApi } from '../services/api';
import EnhancedActionForm from '../components/EnhancedActionForm';
import TestConnection from '../components/TestConnection';

// Icon render helper
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

// HTTP method badge types
const getMethodBadgeType = (method) => {
  switch (method) {
    case 'GET': return BadgeTypes.SUCCESS;
    case 'POST': return BadgeTypes.PRIMARY;
    case 'PUT': return BadgeTypes.WARNING;
    case 'PATCH': return BadgeTypes.INFO;
    case 'DELETE': return BadgeTypes.ERROR;
    default: return BadgeTypes.DEFAULT;
  }
};

const Actions = ({ connector, onBack }) => {
  const [actions, setActions] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (connector) {
      loadActions();
    }
  }, [connector]);

  const loadActions = async () => {
    try {
      const response = await actionsApi.getAll(connector.id);
      setActions(response.data);
    } catch (err) {
      console.error('Failed to load actions:', err);
      setError('Failed to load actions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAction(null);
    setFormOpen(true);
  };

  const handleEdit = (action) => {
    setSelectedAction(action);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this action?')) {
      try {
        await actionsApi.delete(id);
        loadActions();
      } catch (err) {
        setError('Failed to delete action');
      }
    }
  };

  const handleSave = async (data) => {
    if (selectedAction) {
      await actionsApi.update(selectedAction.id, data);
    } else {
      await actionsApi.create(data);
    }
    loadActions();
  };

  const handleTest = (action) => {
    setSelectedAction(action);
    setTestOpen(true);
  };

  const handleToggleStatus = useCallback(async (action) => {
    try {
      await actionsApi.toggleStatus(action.id);
      loadActions();
    } catch (err) {
      console.error('Error toggling action status:', err);
      setError('Failed to toggle action status');
    }
  }, []);

  // Handle clicking on action name - opens edit form
  const handleActionNameClick = useCallback((action) => {
    handleEdit(action);
  }, []);

  const getParametersSummary = (action) => {
    const parts = [];
    const queryCount = Object.keys(action.query_params_config || {}).length;
    const pathCount = Object.keys(action.path_params_config || {}).length;
    const bodyCount = Object.keys(action.request_body_params || {}).length;

    if (queryCount > 0) parts.push(`${queryCount} query`);
    if (pathCount > 0) parts.push(`${pathCount} path`);
    if (bodyCount > 0) parts.push(`${bodyCount} body`);

    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  // Handle table actions
  const handleAction = useCallback((rowId, actionId) => {
    const action = actions.find(a => a.id.toString() === rowId.toString());
    if (!action) return;

    switch (actionId) {
      case 'edit':
        handleEdit(action);
        break;
      case 'test':
        handleTest(action);
        break;
      case 'delete':
        handleDelete(action.id);
        break;
      default:
        break;
    }
  }, [actions]);

  // Table action items - first 2 visible, rest in kebab menu
  const actionItems = useMemo(() => [
    { id: 'edit', label: 'Edit', renderIcon: getRenderIcon(Edit2), tooltipProps: { description: 'Edit action' } },
    { id: 'test', label: 'Test', renderIcon: getRenderIcon(Play), tooltipProps: { description: 'Test action' } },
    { id: 'delete', label: 'Delete', renderIcon: getRenderIcon(Trash2), tooltipProps: { description: 'Delete action' } },
  ], []);

  // Table columns configuration
  const columns = useMemo(() => [
    {
      id: 'name',
      label: 'Action Name',
      accessor: '_nameDisplay',
      type: ColumnTypes.CUSTOM,
      sortable: true,
      width: 200,
    },
    {
      id: 'origin_type',
      label: 'Type',
      accessor: '_typeDisplay',
      type: ColumnTypes.CUSTOM,
      width: 100,
    },
    {
      id: 'http_method',
      label: 'Method',
      accessor: '_methodBadge',
      type: ColumnTypes.BADGE,
      width: 100,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: '_statusDisplay',
      type: ColumnTypes.CUSTOM,
      width: 150,
    },
    {
      id: 'endpoint_path',
      label: 'Endpoint',
      accessor: '_endpointDisplay',
      type: ColumnTypes.CUSTOM,
      width: 200,
    },
    {
      id: 'parameters',
      label: 'Parameters',
      accessor: '_parametersDisplay',
      type: ColumnTypes.CUSTOM,
      width: 150,
    },
  ], []);

  // Transform data for table
  const tableData = useMemo(() => {
    const isConnectorInactive = connector?.status === 'inactive';

    return actions.map(action => ({
      id: action.id.toString(),
      ...action,
      // Name column - clickable purple text
      _nameDisplay: (
        <div>
          <div
            style={{
              fontWeight: 500,
              color: '#7f56d9', // primary-600 purple
              cursor: 'pointer',
            }}
            onClick={() => handleActionNameClick(action)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleActionNameClick(action)}
          >
            {action.name}
          </div>
          {action.description && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              {action.description}
            </div>
          )}
        </div>
      ),
      // Type display (plain text)
      _typeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {action.origin_type === 'system' ? 'System' : 'Custom'}
        </span>
      ),
      // HTTP Method badge
      _methodBadge: {
        label: action.http_method,
        type: getMethodBadgeType(action.http_method),
        size: BadgeSizes.SMALL,
      },
      // Status with Toggle + Badge
      _statusDisplay: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tooltip description={isConnectorInactive ? 'Connector is inactive' : 'Toggle status'}>
            <Toggle
              checked={action.status === 'active'}
              onChange={() => handleToggleStatus(action)}
              size={ToggleSizes.SMALL}
              disabled={isConnectorInactive}
            />
          </Tooltip>
          <Badge
            label={action.status === 'active' ? 'Active' : 'Inactive'}
            type={action.status === 'active' ? BadgeTypes.SUCCESS : BadgeTypes.GRAY}
            size={BadgeSizes.SMALL}
          />
        </div>
      ),
      // Endpoint display
      _endpointDisplay: (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          backgroundColor: '#f5f5f5',
          padding: '4px 8px',
          borderRadius: '4px',
        }}>
          {action.endpoint_path || '/'}
        </span>
      ),
      // Parameters summary
      _parametersDisplay: (
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {getParametersSummary(action)}
        </span>
      ),
      // Disable test action if connector is inactive
      [RowOverrides.DISABLED_ACTIONS]: isConnectorInactive ? ['test'] : [],
    }));
  }, [actions, connector, handleActionNameClick, handleToggleStatus]);

  // PageHeader buttons configuration
  const headerButtons = useMemo(() => [
    {
      id: 'create',
      label: 'Add Action',
      type: ButtonTypes.PRIMARY,
      renderIcon: getRenderIcon(Plus),
    },
  ], []);

  // Handle header button clicks
  const handleHeaderButtonClick = (buttonId) => {
    if (buttonId === 'create') {
      handleCreate();
    }
  };

  // Empty state props
  const emptyStateProps = useMemo(() => ({
    text: 'No actions found',
    supportingText: 'Create your first action for this connector',
  }), []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading actions...' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 2 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: '#7f56d9',
            cursor: 'pointer',
            padding: '4px 0',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back to Connectors
        </button>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {connector?.name} › Actions
        </div>
      </Box>

      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <PageHeader
          text={`Actions for ${connector?.name}`}
          supportingText="Manage API actions and endpoints for this connector"
          buttons={headerButtons}
          onButtonClick={handleHeaderButtonClick}
        />
      </Box>

      {/* Error Banner */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Banner
            type={BannerTypes.ERROR}
            size={BannerSizes.SMALL}
            message={error}
            onClose={() => setError('')}
          />
        </Box>
      )}

      {/* Actions Table */}
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
        {actions.length === 0 ? (
          <EmptyState
            header="No actions found"
            description="Create your first action for this connector"
            primaryButton={{
              label: 'Add Action',
              onClick: handleCreate,
              renderIcon: getRenderIcon(Plus),
            }}
          />
        ) : (
          <Table
            columns={columns}
            data={tableData}
            actionItems={actionItems}
            maxActions={2}
            onAction={handleAction}
            selectable={false}
            showPagination={false}
            emptyStateProps={emptyStateProps}
          />
        )}
      </Box>

      {/* Modals */}
      <EnhancedActionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        action={selectedAction}
        connectorId={connector?.id}
      />

      {selectedAction && (
        <TestConnection
          open={testOpen}
          onClose={() => setTestOpen(false)}
          connector={connector}
          action={selectedAction}
        />
      )}
    </Container>
  );
};

export default Actions;
