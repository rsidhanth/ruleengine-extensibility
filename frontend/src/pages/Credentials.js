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
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { credentialsApi } from '../services/api';
import CredentialForm from '../components/CredentialForm';
import CredentialSetsManager from '../components/CredentialSetsManager';

const Credentials = ({ selectedCredential: initialSelectedCredential, onClearSelectedCredential }) => {
  const [credentials, setCredentials] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setsManagerOpen, setSetsManagerOpen] = useState(false);
  const [selectedCredentialForSets, setSelectedCredentialForSets] = useState(null);

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

  const handleManageSets = (credential) => {
    setSelectedCredentialForSets(credential);
    setSetsManagerOpen(true);
  };

  const handleCloseSetsManager = () => {
    setSetsManagerOpen(false);
    setSelectedCredentialForSets(null);
    loadCredentials(); // Reload to update counts
  };

  const getAuthTypeColor = (authType) => {
    switch (authType) {
      case 'basic': return 'primary';
      case 'api_key': return 'secondary';
      case 'bearer': return 'success';
      case 'oauth2': return 'info';
      case 'custom': return 'warning';
      default: return 'default';
    }
  };

  const getCredentialTypeColor = (credType) => {
    return credType === 'system' ? 'success' : 'default';
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Credentials
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Add Credential
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Auth Type</TableCell>
              <TableCell>Credential Sets</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Operations</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {credentials.map((credential) => (
              <TableRow key={credential.id} hover>
                <TableCell>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {credential.name}
                  </Typography>
                  {credential.description && (
                    <Typography variant="body2" color="textSecondary">
                      {credential.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={credential.credential_type === 'system' ? 'System' : 'Custom'}
                    size="small"
                    color={getCredentialTypeColor(credential.credential_type)}
                    variant="filled"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={credential.auth_type.replace('_', ' ').toUpperCase()}
                    size="small"
                    color={getAuthTypeColor(credential.auth_type)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Manage credential sets">
                    <Button
                      size="small"
                      startIcon={
                        <Badge badgeContent={credential.credential_sets_count || 0} color="primary">
                          <KeyIcon />
                        </Badge>
                      }
                      onClick={() => handleManageSets(credential)}
                    >
                      Manage Sets
                    </Button>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {new Date(credential.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="Edit Profile">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(credential)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(credential.id)}
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

      {credentials.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No credentials found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Create your first credential to get started
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Add Credential
          </Button>
        </Box>
      )}

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
    </Container>
  );
};

export default Credentials;