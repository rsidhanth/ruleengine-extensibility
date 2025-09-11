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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as ActionsIcon,
} from '@mui/icons-material';
import { connectorsApi } from '../services/api';
import ConnectorForm from '../components/ConnectorForm';

const Connectors = ({ onNavigateToActions }) => {
  const [connectors, setConnectors] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Connectors
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Add Connector
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Base URL</TableCell>
              <TableCell>Credential</TableCell>
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
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {connector.description || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {connector.base_url}
                  </Typography>
                </TableCell>
                <TableCell>
                  {connector.credential_name ? (
                    <Chip 
                      label={connector.credential_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
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
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(connector)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleActionsClick(connector)}
                      title="Manage Actions"
                      color="primary"
                    >
                      <ActionsIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(connector.id)}
                      title="Delete"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
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
    </Container>
  );
};

export default Connectors;