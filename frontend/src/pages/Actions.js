import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Alert,
  Breadcrumbs,
  Link,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { actionsApi } from '../services/api';
import EnhancedActionForm from '../components/EnhancedActionForm';
import TestConnection from '../components/TestConnection';

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
      console.log('Loading actions for connector:', connector);
      console.log('Connector ID:', connector.id);
      const response = await actionsApi.getAll(connector.id);
      console.log('Actions response:', response.data);
      console.log('Number of actions:', response.data.length);
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

  const handleToggleStatus = async (action) => {
    try {
      await actionsApi.toggleStatus(action.id);
      loadActions();
    } catch (err) {
      console.error('Error toggling action status:', err);
      setError('Failed to toggle action status');
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'success';
      case 'POST': return 'primary';
      case 'PUT': return 'warning';
      case 'PATCH': return 'info';
      case 'DELETE': return 'error';
      default: return 'default';
    }
  };

  const getOriginTypeColor = (type) => {
    return type === 'system' ? 'success' : 'default';
  };

  const getParametersSummary = (action) => {
    const parts = [];
    const queryCount = Object.keys(action.query_params_config || {}).length;
    const pathCount = Object.keys(action.path_params_config || {}).length;
    const bodyCount = Object.keys(action.request_body_params || {}).length;

    if (queryCount > 0) parts.push(`${queryCount} query param${queryCount > 1 ? 's' : ''}`);
    if (pathCount > 0) parts.push(`${pathCount} path param${pathCount > 1 ? 's' : ''}`);
    if (bodyCount > 0) parts.push(`${bodyCount} body param${bodyCount > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : 'No parameters';
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={onBack}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <BackIcon sx={{ mr: 0.5 }} fontSize="small" />
          Connectors
        </Link>
        <Typography color="text.primary">{connector?.name} - Actions</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Actions for {connector?.name}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Add Action
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {actions.length === 0 && !loading ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No actions found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Create your first action for this connector
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Add Action
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Action Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Method</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Endpoint Path</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Parameters</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {actions.map((action) => (
                <TableRow key={action.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {action.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={action.origin_type === 'system' ? 'System' : 'Custom'}
                      size="small"
                      color={getOriginTypeColor(action.origin_type)}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={action.http_method}
                      size="small"
                      color={getMethodColor(action.http_method)}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={connector?.status === 'inactive' ? 'Connector is inactive' : 'Toggle Active/Inactive'}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={action.status === 'active'}
                            onChange={() => handleToggleStatus(action)}
                            color="success"
                            size="small"
                            disabled={connector?.status === 'inactive'}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {action.status === 'active' ? 'Active' : 'Inactive'}
                          </Typography>
                        }
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      }}
                    >
                      {action.endpoint_path || '/'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {action.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      {getParametersSummary(action)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(action)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleTest(action)}
                      title="Test Action"
                      color="primary"
                    >
                      <TestIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(action.id)}
                      title="Delete"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
