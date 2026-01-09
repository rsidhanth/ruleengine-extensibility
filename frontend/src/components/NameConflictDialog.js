import React, { useState } from 'react';
import {
  Modal,
  ButtonTypes,
  Input,
  InputTypes,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';

const NameConflictDialog = ({ open, onClose, onConfirm, conflictData }) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    onConfirm(newName.trim());
    handleClose();
  };

  const handleClose = () => {
    setNewName('');
    setError('');
    onClose();
  };

  const handleButtonClick = (buttonId) => {
    if (buttonId === 'cancel') {
      handleClose();
    } else if (buttonId === 'confirm') {
      handleConfirm();
    }
  };

  const handleInputChange = (e) => {
    setNewName(e.target.value);
    setError('');
  };

  if (!conflictData) return null;

  const buttons = [
    {
      id: 'cancel',
      type: ButtonTypes.SECONDARY,
      label: 'Cancel',
    },
    {
      id: 'confirm',
      type: ButtonTypes.PRIMARY,
      label: 'Confirm',
    },
  ];

  return (
    <Modal
      open={open}
      header="Name Conflict"
      onClose={handleClose}
      buttons={buttons}
      onButtonClick={handleButtonClick}
      className="name-conflict-modal"
    >
      <div style={{ padding: '0 4px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Banner
            type={BannerTypes.WARNING}
            size={BannerSizes.SMALL}
            message={conflictData.message}
            closeable={false}
            hideIcon={false}
          />
        </div>

        <div style={{
          fontSize: '14px',
          color: '#667085',
          marginBottom: '12px',
        }}>
          Please enter a new name to resolve the conflict:
        </div>

        <Input
          type={InputTypes.TEXT}
          label="New Name"
          value={newName}
          onChange={handleInputChange}
          isInvalid={!!error}
          hintText={error}
          placeholder={conflictData.original_name || ''}
          autoFocus
        />
      </div>
    </Modal>
  );
};

export default NameConflictDialog;
