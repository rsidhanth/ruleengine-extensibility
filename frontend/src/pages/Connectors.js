import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  IconButton,
  Chip,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as ActionsIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
} from '@mui/icons-material';
import { connectorsApi } from '../services/api';
import ConnectorForm from '../components/ConnectorForm';
import ImportModal from '../components/ImportModal';
import ConnectorConflictDialog from '../components/ConnectorConflictDialog';
import CredentialSetForm from '../components/CredentialSetForm';

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
      // We need to pass the full credential object
      // Since we only have the credential ID, we'll construct a minimal credential object
      const credential = {
        id: connector.credential,
        name: connector.credential_name
      };
      onNavigateToCredentialSets(credential);
    }
  };

  const handleAddCredentialSet = (connector) => {
    // Construct the credential object needed by CredentialSetForm
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
    loadConnectors(); // Refresh to update credential sets count
  };

  const handleToggleStatus = async (connector) => {
    try {
      await connectorsApi.toggleStatus(connector.id);
      setError(''); // Clear any previous errors
      loadConnectors();
    } catch (err) {
      console.error('Error toggling connector status:', err);
      const errorMessage = err.response?.data?.error || 'Failed to toggle connector status';
      setError(errorMessage);
    }
  };

  const getConnectorTypeColor = (type) => {
    return type === 'system' ? 'success' : 'default';
  };

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

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Connectors
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportModalOpen(true)}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Add Connector
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Base URL</TableCell>
              <TableCell>Credential Sets</TableCell>
              <TableCell align="center">Actions</TableCell>
              <TableCell align="center">Operations</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connectors.map((connector) => (
              <TableRow key={connector.id} hover>
                <TableCell>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {connector.name}
                  </Typography>
                  {connector.description && (
                    <Typography variant="body2" color="textSecondary">
                      {connector.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={connector.connector_type === 'system' ? 'System' : 'Custom'}
                    size="small"
                    color={getConnectorTypeColor(connector.connector_type)}
                    variant="filled"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Toggle Active/Inactive (cascades to actions)">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={connector.status === 'active'}
                          onChange={() => handleToggleStatus(connector)}
                          color="success"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {connector.status === 'active' ? 'Active' : 'Inactive'}
                        </Typography>
                      }
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {connector.base_url}
                  </Typography>
                </TableCell>
                <TableCell>
                  {connector.credential_name ? (
                    <Box>
                      {connector.credential_sets_count > 0 ? (
                        <Tooltip title="Click to view and manage credential sets">
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleCredentialSetsClick(connector)}
                            sx={{ textTransform: 'none' }}
                          >
                            {`${connector.credential_sets_count} set${connector.credential_sets_count !== 1 ? 's' : ''}`}
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Add credentials to enable this connector">
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleAddCredentialSet(connector)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              py: 0.25,
                              px: 1,
                            }}
                          >
                            + Add Set
                          </Button>
                        </Tooltip>
                      )}
                      <Typography variant="caption" color="textSecondary" display="block">
                        Profile: {connector.credential_name}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No credential
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${connector.actions?.length || 0} actions`}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="Export">
                      <IconButton
                        size="small"
                        onClick={() => handleExport(connector)}
                        color="info"
                      >
                        <ExportIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(connector)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Manage Actions">
                      <IconButton
                        size="small"
                        onClick={() => handleActionsClick(connector)}
                        color="primary"
                      >
                        <ActionsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(connector.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {connectors.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No connectors found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Create your first connector to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Add Connector
          </Button>
        </Box>
      )}

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