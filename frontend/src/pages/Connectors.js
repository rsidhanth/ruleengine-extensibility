import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import {
  Button,
  ButtonTypes,
  ButtonSizes,
  Table,
  ColumnTypes,
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
import { Edit2, Trash2, Download, Upload, Plus, Settings } from 'react-feather';
import { connectorsApi } from '../services/api';
import ConnectorForm from '../components/ConnectorForm';
import ImportModal from '../components/ImportModal';
import ConnectorConflictDialog from '../components/ConnectorConflictDialog';
import CredentialSetForm from '../components/CredentialSetForm';

// Icon render helper
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

const Connectors = ({ onNavigateToActions, onNavigateToCredentialSets }) => {
  const [connectors, setConnectors] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [connectorConflictData, setConnectorConflictData] = useState(null);
  const [importDataCache, setImportDataCache] = useState(null);
  const [credentialSetFormOpen, setCredentialSetFormOpen] = useState(false);
  const [selectedCredentialForSet, setSelectedCredentialForSet] = useState(null);

  useEffect(() => {
    loadConnectors();
  }, []);

  const loadConnectors = async () => {
    try {
      const response = await connectorsApi.getAll();
      setConnectors(response.data);
    } catch (err) {
      setError('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedConnector(null);
    setFormOpen(true);
  };

  const handleEdit = (connector) => {
    setSelectedConnector(connector);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this connector?')) {
      try {
        await connectorsApi.delete(id);
        loadConnectors();
      } catch (err) {
        setError('Failed to delete connector');
      }
    }
  };

  const handleSave = async (data) => {
    if (selectedConnector) {
      await connectorsApi.update(selectedConnector.id, data);
    } else {
      await connectorsApi.create(data);
    }
    loadConnectors();
  };

  const handleActionsClick = (connector) => {
    onNavigateToActions(connector);
  };

  const handleCredentialSetsClick = (connector) => {
    if (connector.credential && onNavigateToCredentialSets) {
      const credential = {
        id: connector.credential,
        name: connector.credential_name
      };
      onNavigateToCredentialSets(credential);
    }
  };

  const handleAddCredentialSet = (connector) => {
    const credential = {
      id: connector.credential,
      name: connector.credential_name,
      auth_type: connector.credential_auth_type
    };
    setSelectedCredentialForSet(credential);
    setCredentialSetFormOpen(true);
  };

  const handleCredentialSetSaved = () => {
    setSuccessMessage('Credential set created successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
    loadConnectors();
  };

  const handleToggleStatus = useCallback(async (connector) => {
    try {
      await connectorsApi.toggleStatus(connector.id);
      setError('');
      loadConnectors();
      const newStatus = connector.status === 'active' ? 'inactive' : 'active';
      setSuccessMessage(`Connector ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error toggling connector status:', err);
      const errorMessage = err.response?.data?.error || 'Failed to toggle connector status';
      setError(errorMessage);
    }
  }, []);

  // Handle clicking on connector name - opens edit form
  const handleConnectorNameClick = useCallback((connector) => {
    handleEdit(connector);
  }, []);

  const handleExport = async (connector) => {
    try {
      const response = await connectorsApi.export(connector.id);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connector-${connector.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage('Connector exported successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to export connector');
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

      const response = await connectorsApi.import(requestData);

      if (response.data.success) {
        const messages = ['Connector imported successfully'];
        if (response.data.credential_profile_created) {
          messages.push('New credential profile created');
        } else if (response.data.credential_profile_reused) {
          messages.push('Using existing credential profile');
        }
        setSuccessMessage(messages.join('. '));
        setTimeout(() => setSuccessMessage(''), 5000);
        loadConnectors();
        setImportDataCache(null);
        setImportModalOpen(false);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;

      if (errorType === 'connector_name_conflict' || errorType === 'credential_name_conflict') {
        setConnectorConflictData({
          type: err.response.data.conflict_type,
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

  const handleConflictResolve = async (resolution) => {
    try {
      const requestData = {
        ...importDataCache,
        ...resolution
      };

      const response = await connectorsApi.import(requestData);

      if (response.data.success) {
        const messages = ['Connector imported successfully'];
        if (response.data.credential_profile_created) {
          messages.push('New credential profile created');
        } else if (response.data.credential_profile_reused) {
          messages.push('Using existing credential profile');
        }
        setSuccessMessage(messages.join('. '));
        setTimeout(() => setSuccessMessage(''), 5000);
        loadConnectors();
        setImportDataCache(null);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;
      if (errorType === 'connector_name_conflict' || errorType === 'credential_name_conflict') {
        setConnectorConflictData({
          type: err.response.data.conflict_type,
          data: err.response.data,
          originalData: importDataCache
        });
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    } finally {
      setConnectorConflictData(null);
    }
  };

  // Handle table actions
  const handleAction = (rowId, actionId) => {
    const connector = connectors.find(c => c.id === rowId);
    if (!connector) return;

    switch (actionId) {
      case 'edit':
        handleEdit(connector);
        break;
      case 'actions':
        handleActionsClick(connector);
        break;
      case 'export':
        handleExport(connector);
        break;
      case 'delete':
        handleDelete(connector.id);
        break;
      default:
        break;
    }
  };

  // PageHeader buttons configuration
  const headerButtons = useMemo(() => [
    {
      id: 'import',
      label: 'Import',
      type: ButtonTypes.SECONDARY,
      renderIcon: getRenderIcon(Upload),
    },
    {
      id: 'create',
      label: 'Add Connector',
      type: ButtonTypes.PRIMARY,
      renderIcon: getRenderIcon(Plus),
    },
  ], []);

  // Handle header button clicks
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

  // Table action items - first 2 visible, rest in kebab menu
  const actionItems = useMemo(() => [
    { id: 'edit', label: 'Edit', renderIcon: getRenderIcon(Edit2), tooltipProps: { description: 'Edit connector' } },
    { id: 'actions', label: 'Manage Actions', renderIcon: getRenderIcon(Settings), tooltipProps: { description: 'Manage connector actions' } },
    { id: 'export', label: 'Export', renderIcon: getRenderIcon(Download), tooltipProps: { description: 'Export connector' } },
    { id: 'delete', label: 'Delete', renderIcon: getRenderIcon(Trash2), tooltipProps: { description: 'Delete connector' } },
  ], []);

  // Table columns
  const columns = useMemo(() => [
    {
      id: 'name',
      label: 'Name',
      accessor: '_nameDisplay',
      type: ColumnTypes.CUSTOM,
      sortable: true,
      width: 250,
    },
    {
      id: 'connector_type',
      label: 'Type',
      accessor: '_typeDisplay',
      type: ColumnTypes.CUSTOM,
      width: 100,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: '_statusToggle',
      type: ColumnTypes.CUSTOM,
      width: 150,
    },
    {
      id: 'base_url',
      label: 'Base URL',
      accessor: '_baseUrlDisplay',
      type: ColumnTypes.CUSTOM,
      width: 200,
    },
    {
      id: 'actions_count',
      label: 'Actions',
      accessor: '_actionsCountBadge',
      type: ColumnTypes.BADGE,
      width: 100,
    },
    {
      id: 'credential_sets',
      label: 'Credential Sets',
      accessor: '_credentialSetsDisplay',
      type: ColumnTypes.CUSTOM,
      width: 180,
    },
  ], []);

  // Transform data for table
  const tableData = useMemo(() => {
    return connectors.map(connector => ({
      id: connector.id.toString(),
      ...connector,
      // Name column with description - clickable purple text
      _nameDisplay: (
        <div>
          <div
            style={{
              fontWeight: 500,
              color: '#7f56d9', // primary-600 purple
              cursor: 'pointer',
            }}
            onClick={() => handleConnectorNameClick(connector)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleConnectorNameClick(connector)}
          >
            {connector.name}
          </div>
          {connector.description && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              {connector.description}
            </div>
          )}
        </div>
      ),
      // Type display (plain text)
      _typeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {connector.connector_type === 'system' ? 'System' : 'Custom'}
        </span>
      ),
      // Status with toggle + badge
      _statusToggle: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Toggle
            checked={connector.status === 'active'}
            onChange={() => handleToggleStatus(connector)}
            size={ToggleSizes.SMALL}
          />
          <Badge
            label={connector.status === 'active' ? 'Active' : 'Inactive'}
            type={connector.status === 'active' ? BadgeTypes.SUCCESS : BadgeTypes.GRAY}
            size={BadgeSizes.SMALL}
          />
        </div>
      ),
      // Base URL display
      _baseUrlDisplay: (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          backgroundColor: '#f5f5f5',
          padding: '4px 8px',
          borderRadius: '4px',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}>
          {connector.base_url}
        </span>
      ),
      // Credential sets display
      _credentialSetsDisplay: !connector.credential_name ? (
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>No credential</span>
      ) : (
        <div>
          <div style={{ display: 'inline-block', width: '90px' }} className="credential-set-btn">
            {connector.credential_sets_count > 0 ? (
              <Tooltip description="Click to view and manage credential sets">
                <Button
                  type={ButtonTypes.SECONDARY}
                  size={ButtonSizes.SMALL}
                  label={`${connector.credential_sets_count} set${connector.credential_sets_count !== 1 ? 's' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCredentialSetsClick(connector);
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip description="Add credentials to enable this connector">
                <Button
                  type={ButtonTypes.SECONDARY}
                  size={ButtonSizes.SMALL}
                  label="+ Add Set"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddCredentialSet(connector);
                  }}
                />
              </Tooltip>
            )}
          </div>
        </div>
      ),
      // Actions count badge
      _actionsCountBadge: {
        label: `${connector.actions?.length || 0} actions`,
        type: BadgeTypes.PRIMARY,
        size: BadgeSizes.SMALL,
      },
    }));
  }, [connectors, handleConnectorNameClick, handleToggleStatus]);

  // Empty state props
  const emptyStateProps = useMemo(() => ({
    header: 'No connectors found',
    description: 'Create your first connector to get started',
    primaryButton: {
      label: 'Add Connector',
      onClick: handleCreate,
      renderIcon: getRenderIcon(Plus),
    },
  }), []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading connectors...' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <PageHeader
          text="Connectors"
          supportingText="Manage API connectors and integrations"
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

      {/* Success Banner */}
      {successMessage && (
        <Box sx={{ mb: 2 }}>
          <Banner
            type={BannerTypes.SUCCESS}
            size={BannerSizes.SMALL}
            message={successMessage}
            onClose={() => setSuccessMessage('')}
          />
        </Box>
      )}

      {/* Connectors Table */}
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
        {connectors.length === 0 ? (
          <EmptyState
            header="No connectors found"
            description="Create your first connector to get started"
            primaryButton={{
              label: 'Add Connector',
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

      {/* Modals and Dialogs */}
      <ConnectorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        connector={selectedConnector}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportDataCache(null);
        }}
        onImport={handleImport}
        title="Import Connector"
      />

      <ConnectorConflictDialog
        open={!!connectorConflictData}
        onClose={() => {
          setConnectorConflictData(null);
          setImportDataCache(null);
        }}
        onConfirm={handleConflictResolve}
        conflictData={connectorConflictData}
      />

      <CredentialSetForm
        open={credentialSetFormOpen}
        onClose={() => {
          setCredentialSetFormOpen(false);
          setSelectedCredentialForSet(null);
        }}
        credential={selectedCredentialForSet}
        onSave={handleCredentialSetSaved}
      />
    </Container>
  );
};

export default Connectors;
