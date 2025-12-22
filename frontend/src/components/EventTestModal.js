import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Alert,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { eventsApi } from '../services/api';

const EventTestModal = ({ open, onClose, event }) => {
  const [testEndpoint, setTestEndpoint] = useState('');
  const [samplePayload, setSamplePayload] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (open && event) {
      loadTestEndpoint();
      loadSamplePayload();
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [open, event]);

  const loadTestEndpoint = async () => {
    try {
      const response = await eventsApi.getTestEndpoint(event.id);
      setTestEndpoint(response.data.test_endpoint);
    } catch (err) {
      console.error('Error loading test endpoint:', err);
      setError('Failed to load test endpoint');
    }
  };

  const loadSamplePayload = async () => {
    try {
      const response = await eventsApi.getSamplePayload(event.id);
      setSamplePayload(response.data.sample_payload);
    } catch (err) {
      console.error('Error loading sample payload:', err);
      // Don't set error, sample payload is optional
    }
  };

  const loadTestPayload = async () => {
    setLoading(true);
    try {
      const response = await eventsApi.getTestPayload(event.id);
      setPayload(response.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        // No payload yet, this is expected
        setPayload(null);
      } else {
        console.error('Error loading test payload:', err);
        setError('Failed to load test payload');
      }
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    // Load immediately
    loadTestPayload();

    // Then poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      loadTestPayload();
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(testEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    stopPolling();
    setPayload(null);
    setTestEndpoint('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Test Event: {event?.name}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Test Endpoint Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Test Endpoint URL
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                flex: 1,
                backgroundColor: 'white',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all'
              }}
            >
              {testEndpoint || 'Loading...'}
            </Paper>
            <IconButton
              onClick={handleCopyEndpoint}
              color={copied ? 'success' : 'default'}
              size="small"
            >
              <CopyIcon />
            </IconButton>
          </Box>
          <Alert severity="info" sx={{ mt: 1 }}>
            Send a POST request to the above endpoint with any JSON payload to test the event flow
          </Alert>
        </Paper>

        {/* Sample Payload Section */}
        {samplePayload && (
          <>
            <Divider sx={{ my: 2 }}>
              <Chip label="Expected Payload Format" size="small" color="info" />
            </Divider>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                maxHeight: '300px',
                overflow: 'auto'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#569cd6' }}>
                  Sample Payload Format
                </Typography>
                <IconButton
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  color={copied ? 'success' : 'default'}
                  size="small"
                  sx={{ color: copied ? '#4caf50' : '#d4d4d4' }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {JSON.stringify(samplePayload, null, 2)}
              </Typography>
            </Paper>
          </>
        )}

        <Divider sx={{ my: 2 }}>
          <Chip label="Received Payload" size="small" />
        </Divider>

        {/* Payload Display Section */}
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {payload ? 'Latest Payload' : 'Waiting for payload...'}
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>

          {payload ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={`Received at: ${new Date(payload.timestamp).toLocaleString()}`}
                  size="small"
                  color="success"
                  sx={{ mb: 1 }}
                />
                <Chip
                  label={`Method: ${payload.method}`}
                  size="small"
                  sx={{ ml: 1, mb: 1 }}
                />
              </Box>

              <Typography
                variant="body2"
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {JSON.stringify(payload.payload, null, 2)}
              </Typography>

              {Object.keys(payload.headers).length > 0 && (
                <>
                  <Divider sx={{ my: 2, borderColor: '#444' }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Request Headers:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      opacity: 0.7
                    }}
                  >
                    {JSON.stringify(payload.headers, null, 2)}
                  </Typography>
                </>
              )}
            </Paper>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: '#f9f9f9'
              }}
            >
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No payload received yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The payload will appear here automatically when the endpoint is called
              </Typography>
              {loading && (
                <Box sx={{ mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Paper>
          )}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadTestPayload}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EventTestModal;
