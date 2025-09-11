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
} from '@mui/icons-material';
import { credentialsApi } from '../services/api';
import CredentialForm from '../components/CredentialForm';

const Credentials = () => {
  const [credentials, setCredentials] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

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


  const getAuthTypeColor = (authType) => {
    switch (authType) {
      case 'basic': return 'primary';
      case 'api_key': return 'secondary';
      case 'bearer': return 'success';
      case 'oauth2': return 'info';
      default: return 'default';
    }
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
              <TableCell>Description</TableCell>
              <TableCell>Authentication Type</TableCell>
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
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {credential.description || 'No description'}
                  </Typography>
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
                  <Typography variant="body2" color="textSecondary">
                    {new Date(credential.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(credential)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(credential.id)}
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
    </Container>
  );
};

export default Credentials;