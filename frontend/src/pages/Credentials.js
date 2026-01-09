import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import {
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
  Tooltip,
  PageHeader,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Edit2, Trash2, Plus, Key, Upload } from 'react-feather';
import { credentialsApi } from '../services/api';
import CredentialForm from '../components/CredentialForm';
import CredentialSetsManager from '../components/CredentialSetsManager';
import ImportModal from '../components/ImportModal';

// Icon render helper
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

// Format auth type to camel case
const formatAuthType = (authType) => {
  if (!authType) return 'N/A';
  if (authType === 'oauth2') return 'OAuth2';
  return authType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const Credentials = ({ selectedCredential: initialSelectedCredential, onClearSelectedCredential }) => {
  const [credentials, setCredentials] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [setsManagerOpen, setSetsManagerOpen] = useState(false);
  const [selectedCredentialForSets, setSelectedCredentialForSets] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  useEffect(() => {
    // If a credential was passed from navigation, open its sets manager
    if (initialSelectedCredential && credentials.length > 0) {
      const fullCredential = credentials.find(c => c.id === initialSelectedCredential.id);
      if (fullCredential) {
        setSelectedCredentialForSets(fullCredential);
        setSetsManagerOpen(true);
        // Clear the selected credential in parent to prevent reopening
        if (onClearSelectedCredential) {
          onClearSelectedCredential();
        }
      }
    }
  }, [initialSelectedCredential, credentials, onClearSelectedCredential]);

  const loadCredentials = async () => {
    try {
      const response = await credentialsApi.getAll();
      setCredentials(response.data);
    } catch (err) {
      setError('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCredential(null);
    setFormOpen(true);
  };

  const handleEdit = (credential) => {
    setSelectedCredential(credential);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await credentialsApi.delete(id);
        loadCredentials();
      } catch (err) {
        setError('Failed to delete credential');
      }
    }
  };

  const handleSave = async (data) => {
    if (selectedCredential) {
      await credentialsApi.update(selectedCredential.id, data);
    } else {
      await credentialsApi.create(data);
    }
    loadCredentials();
  };

  const handleManageSets = useCallback((credential) => {
    setSelectedCredentialForSets(credential);
    setSetsManagerOpen(true);
  }, []);

  const handleCloseSetsManager = () => {
    setSetsManagerOpen(false);
    setSelectedCredentialForSets(null);
    loadCredentials(); // Reload to update counts
  };

  // Handle clicking on credential name - opens edit form
  const handleCredentialNameClick = useCallback((credential) => {
    handleEdit(credential);
  }, []);

  // Handle import
  const handleImport = async (file) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      const response = await credentialsApi.import(importData);
      if (response.data.success) {
        setSuccessMessage('Credential imported successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadCredentials();
        setImportModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    }
  };

  // Handle table actions
  const handleAction = useCallback((rowId, actionId) => {
    const credential = credentials.find(c => c.id.toString() === rowId.toString());
    if (!credential) return;

    switch (actionId) {
      case 'edit':
        handleEdit(credential);
        break;
      case 'manage_sets':
        handleManageSets(credential);
        break;
      case 'delete':
        handleDelete(credential.id);
        break;
      default:
        break;
    }
  }, [credentials, handleManageSets]);

  // Table action items - first 2 visible, rest in kebab menu
  const actionItems = useMemo(() => [
    { id: 'edit', label: 'Edit Profile', renderIcon: getRenderIcon(Edit2), tooltipProps: { description: 'Edit credential profile' } },
    { id: 'manage_sets', label: 'Manage Sets', renderIcon: getRenderIcon(Key), tooltipProps: { description: 'Manage credential sets' } },
    { id: 'delete', label: 'Delete', renderIcon: getRenderIcon(Trash2), tooltipProps: { description: 'Delete credential' } },
  ], []);

  // Table columns configuration
  const columns = useMemo(() => [
    {
      id: 'name',
      label: 'Profile Name',
      accessor: '_nameDisplay',
      type: ColumnTypes.CUSTOM,
      sortable: true,
      width: 250,
    },
    {
      id: 'credential_type',
      label: 'Type',
      accessor: '_typeDisplay',
      type: ColumnTypes.CUSTOM,
      width: 100,
    },
    {
      id: 'auth_type',
      label: 'Auth Type',
      accessor: '_authTypeDisplay',
      type: ColumnTypes.CUSTOM,
      width: 120,
    },
    {
      id: 'created_at',
      label: 'Created',
      accessor: '_createdDisplay',
      type: ColumnTypes.CUSTOM,
      width: 120,
    },
    {
      id: 'credential_sets_count',
      label: 'Credential Sets',
      accessor: '_setsDisplay',
      type: ColumnTypes.CUSTOM,
      width: 150,
    },
  ], []);

  // Transform data for table
  const tableData = useMemo(() => {
    return credentials.map(credential => ({
      id: credential.id.toString(),
      ...credential,
      // Name column - clickable purple text
      _nameDisplay: (
        <div>
          <div
            style={{
              fontWeight: 500,
              color: '#7f56d9', // primary-600 purple
              cursor: 'pointer',
            }}
            onClick={() => handleCredentialNameClick(credential)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCredentialNameClick(credential)}
          >
            {credential.name}
          </div>
          {credential.description && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              {credential.description}
            </div>
          )}
        </div>
      ),
      // Type display (plain text)
      _typeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {credential.credential_type === 'system' ? 'System' : 'Custom'}
        </span>
      ),
      // Auth type display (plain text)
      _authTypeDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>
          {formatAuthType(credential.auth_type)}
        </span>
      ),
      // Credential sets display
      _setsDisplay: (
        <Tooltip description="Manage credential sets">
          <Button
            type={ButtonTypes.SECONDARY}
            size={ButtonSizes.SMALL}
            label={`${credential.credential_sets_count || 0} sets`}
            onClick={(e) => {
              e.stopPropagation();
              handleManageSets(credential);
            }}
            renderIcon={getRenderIcon(Key)}
          />
        </Tooltip>
      ),
      // Created date display
      _createdDisplay: (
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {new Date(credential.created_at).toLocaleDateString()}
        </span>
      ),
    }));
  }, [credentials, handleCredentialNameClick, handleManageSets]);

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
      label: 'Create Profile',
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

  // Empty state props
  const emptyStateProps = useMemo(() => ({
    text: 'No credential profiles found',
    supportingText: 'Create your first credential profile to get started',
  }), []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading credentials...' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <PageHeader
          text="Credential Profiles"
          supportingText="Manage authentication profiles and credential sets"
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

      {/* Credentials Table */}
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
        {credentials.length === 0 ? (
          <EmptyState
            header="No credential profiles found"
            description="Create your first credential profile to get started"
            primaryButton={{
              label: 'Create Profile',
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
      <CredentialForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        credential={selectedCredential}
      />

      <CredentialSetsManager
        open={setsManagerOpen}
        onClose={handleCloseSetsManager}
        credential={selectedCredentialForSets}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
        title="Import Credential Profile"
      />
    </Container>
  );
};

export default Credentials;
