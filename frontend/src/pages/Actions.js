import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Chip,
  Box,
  Alert,
  Breadcrumbs,
  Link,
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
      const response = await actionsApi.getAll(connector.id);
      setActions(response.data);
    } catch (err) {
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

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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

      <Grid container spacing={3}>
        {actions.map((action) => (
          <Grid item xs={12} md={6} lg={4} key={action.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                    {action.name}
                  </Typography>
                  <Chip 
                    label={action.http_method}
                    size="small"
                    color={getMethodColor(action.http_method)}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {action.description || 'No description'}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Path:</strong> {action.endpoint_path || '/'}
                </Typography>
                
                <Box sx={{ mt: 1 }}>
                  {Object.keys(action.query_params || {}).length > 0 && (
                    <Chip 
                      label={`${Object.keys(action.query_params).length} query params`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  )}
                  {Object.keys(action.headers || {}).length > 0 && (
                    <Chip 
                      label={`${Object.keys(action.headers).length} headers`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  )}
                  {Object.keys(action.request_body || {}).length > 0 && (
                    <Chip 
                      label="Has body"
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  )}
                </Box>
              </CardContent>
              <CardActions>
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
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {actions.length === 0 && !loading && (
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