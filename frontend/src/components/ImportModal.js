import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

const ImportModal = ({ open, onClose, onImport, title = 'Import' }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    setError(null);

    if (selectedFile.type !== 'application/json') {
      setError('Please select a valid JSON file');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setPreview(JSON.stringify(json, null, 2));
      } catch (err) {
        setError('Invalid JSON format');
        setFile(null);
        setPreview(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onImport(file);
      handleClose();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setLoading(false);
    setDragActive(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              border: `2px dashed ${dragActive ? '#1976d2' : '#ccc'}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              mb: 2,
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <UploadIcon sx={{ fontSize: 48, color: dragActive ? '#1976d2' : '#999', mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              {file ? file.name : 'Drag & drop a JSON file here, or click to select'}
            </Typography>
          </Box>

          {preview && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Preview:
              </Typography>
              <Box
                sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  p: 2,
                  maxHeight: 300,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre',
                }}
              >
                {preview}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportModal;
