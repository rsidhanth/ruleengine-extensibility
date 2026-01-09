import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  ButtonTypes,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import FileUpload, { FileUploadTypes } from '@leegality/leegality-react-component-library/dist/file-upload';

const ImportModal = ({ open, onClose, onImport, title = 'Import' }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetFiles, setResetFiles] = useState(false);
  const fileUploadRef = useRef(null);

  const handleFile = useCallback((selectedFile) => {
    setError(null);

    if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
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
  }, []);

  const handleFileDrop = useCallback((files) => {
    if (files && files.length > 0) {
      // FileUpload returns array of file objects with .file property
      const fileObj = files[0].file || files[0];
      handleFile(fileObj);
    }
  }, [handleFile]);

  const handleFileDelete = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
  }, []);

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
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setLoading(false);
    setResetFiles(true);
    setTimeout(() => setResetFiles(false), 100);
    onClose();
  };

  const handleButtonClick = (buttonId) => {
    if (buttonId === 'cancel') {
      handleClose();
    } else if (buttonId === 'import') {
      handleImport();
    }
  };

  // Fix for click-to-upload not working inside Modal
  // The FileUpload component's click handler doesn't properly trigger the file input
  const handleUploadAreaClick = useCallback(() => {
    const fileInput = fileUploadRef.current?.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.click();
    }
  }, []);

  const buttons = [
    {
      id: 'cancel',
      type: ButtonTypes.SECONDARY,
      label: 'Cancel',
      disabled: loading,
    },
    {
      id: 'import',
      type: ButtonTypes.PRIMARY,
      label: loading ? 'Importing...' : 'Import',
      disabled: !file || loading,
      loading: loading,
    },
  ];

  return (
    <Modal
      open={open}
      header={title}
      onClose={handleClose}
      buttons={buttons}
      onButtonClick={handleButtonClick}
      className="import-modal"
    >
      <div style={{ padding: '0 4px' }}>
        {error && (
          <div style={{ marginBottom: '16px' }}>
            <Banner
              type={BannerTypes.ERROR}
              size={BannerSizes.SMALL}
              message={error}
              closeable={false}
              hideIcon={false}
            />
          </div>
        )}

        <div ref={fileUploadRef} onClick={!file ? handleUploadAreaClick : undefined} style={{ cursor: !file ? 'pointer' : 'default' }}>
          <FileUpload
            type={FileUploadTypes.DEFAULT}
            accept={['application/json']}
            multiple={false}
            onFileDrop={handleFileDrop}
            onFileDelete={handleFileDelete}
            showUploadedSection={true}
            persistUploadSection={false}
            primaryMsg="Click to upload or drag and drop"
            supportingMsg="JSON files only"
            resetFiles={resetFiles}
            autoUpload={false}
          />
        </div>

        {preview && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#344054',
              marginBottom: '8px',
            }}>
              Preview:
            </div>
            <div
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e4e7ec',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '300px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px',
                whiteSpace: 'pre',
                color: '#344054',
              }}
            >
              {preview}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportModal;
