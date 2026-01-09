import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Modal,
  ModalTypes,
  Button,
  ButtonTypes,
  ButtonSizes,
  Input,
  InputTypes,
  ToggleSizes,
  Checkbox,
  CheckboxTypes,
  DropdownSingleSelect,
  Accordion,
  AccordionTypes,
  AccordionSizes,
  ContentDivider,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Plus, Save } from 'react-feather';

const defaultParameters = {
  "CPID": {
    "type": "string",
    "required": true,
    "description": "Document ID"
  },
  "PurposeIDs": {
    "type": "array",
    "required": true,
    "description": "List of purpose IDs",
    "items": {
      "type": "string"
    }
  }
};

const sampleAcknowledgementPayload = {
  status: 'success',
  message: 'Event received successfully',
  timestamp: '2024-01-01T00:00:00Z'
};

// HTTP Status Code options for dropdown
const httpStatusCodes = [
  { id: '200', label: '200 - OK', selected: false },
  { id: '201', label: '201 - Created', selected: false },
  { id: '202', label: '202 - Accepted', selected: false },
  { id: '203', label: '203 - Non-Authoritative', selected: false },
];

const EventForm = ({ open, onClose, onSave, event = null }) => {
  const modalId = useMemo(() => uuidv4(), []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_format: 'JSON',
    parameters: {},
    acknowledgement_enabled: false,
    acknowledgement_type: 'basic',
    acknowledgement_status_code: 200,
    acknowledgement_payload: {},
    status: 'active',
  });
  const [error, setError] = useState('');
  const [parametersJson, setParametersJson] = useState('');
  const [acknowledgementPayloadJson, setAcknowledgementPayloadJson] = useState('');
  const [saving, setSaving] = useState(false);

  // Dropdown items for status codes
  const [statusCodeItems, setStatusCodeItems] = useState(httpStatusCodes);

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name || '',
        description: event.description || '',
        event_format: event.event_format || 'JSON',
        parameters: event.parameters || {},
        acknowledgement_enabled: event.acknowledgement_enabled || false,
        acknowledgement_type: event.acknowledgement_type || 'basic',
        acknowledgement_status_code: event.acknowledgement_status_code || 200,
        acknowledgement_payload: event.acknowledgement_payload || {},
        status: event.status || 'active',
      });
      setParametersJson(JSON.stringify(event.parameters || defaultParameters, null, 2));
      setAcknowledgementPayloadJson(JSON.stringify(event.acknowledgement_payload || sampleAcknowledgementPayload, null, 2));
      // Set the selected status code
      setStatusCodeItems(httpStatusCodes.map(item => ({
        ...item,
        selected: item.id === String(event.acknowledgement_status_code || 200)
      })));
    } else {
      setFormData({
        name: '',
        description: '',
        event_format: 'JSON',
        parameters: defaultParameters,
        acknowledgement_enabled: false,
        acknowledgement_type: 'basic',
        acknowledgement_status_code: 200,
        acknowledgement_payload: {},
        status: 'active',
      });
      setParametersJson(JSON.stringify(defaultParameters, null, 2));
      setAcknowledgementPayloadJson(JSON.stringify(sampleAcknowledgementPayload, null, 2));
      setStatusCodeItems(httpStatusCodes.map(item => ({
        ...item,
        selected: item.id === '200'
      })));
    }
    setError('');
    setSaving(false);
  }, [event, open]);

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setFormData({ ...formData, description: e.target.value });
  };

  const handleParametersChange = (e) => {
    const value = e.target.value;
    setParametersJson(value);

    // Try to parse JSON
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        setFormData({
          ...formData,
          parameters: parsed,
        });
      } else {
        setFormData({
          ...formData,
          parameters: {},
        });
      }
    } catch (err) {
      // Invalid JSON, don't update formData yet
    }
  };

  const handleAcknowledgementPayloadChange = (e) => {
    const value = e.target.value;
    setAcknowledgementPayloadJson(value);

    // Try to parse JSON
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        setFormData({
          ...formData,
          acknowledgement_payload: parsed,
        });
      } else {
        setFormData({
          ...formData,
          acknowledgement_payload: {},
        });
      }
    } catch (err) {
      // Invalid JSON, don't update formData yet
    }
  };

  const handleAcknowledgementToggle = (checked) => {
    setFormData({ ...formData, acknowledgement_enabled: checked });
  };

  const handleAcknowledgementTypeChange = (type) => {
    setFormData({ ...formData, acknowledgement_type: type });
  };

  const handleStatusCodeSelect = (itemId) => {
    setStatusCodeItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        selected: item.id === itemId
      }))
    );
    setFormData({
      ...formData,
      acknowledgement_status_code: parseInt(itemId, 10)
    });
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Event name is required');
      return;
    }

    // Validate parameters JSON if provided
    if (parametersJson.trim()) {
      try {
        JSON.parse(parametersJson);
      } catch (err) {
        setError('Invalid JSON format in Parameters field');
        return;
      }
    }

    // Validate acknowledgement payload JSON if custom type and enabled
    if (formData.acknowledgement_enabled && formData.acknowledgement_type === 'custom' && acknowledgementPayloadJson.trim()) {
      try {
        JSON.parse(acknowledgementPayloadJson);
      } catch (err) {
        setError('Invalid JSON format in Acknowledgement Payload field');
        return;
      }
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  // Icon render helper
  const getRenderIcon = (IconComponent) => IconComponent
    ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} />
    : null;

  // Toggle props for acknowledgement accordion
  const acknowledgementToggleProps = {
    withToggle: true,
    isToggled: formData.acknowledgement_enabled,
    onToggleChange: handleAcknowledgementToggle,
    toggleSize: ToggleSizes.MEDIUM,
    isToggleDisabled: false,
  };

  return (
    <Modal
      open={open}
      type={ModalTypes.WITH_HEIGHT_TRANSITIONS}
      id={modalId}
      header={event ? 'Edit Event' : 'Create New Event'}
      showClose={true}
      onClose={handleClose}
      className="event-form-modal"
    >
      <div className="modal-content-wrapper" style={{ padding: '0 24px' }}>
        {/* Error Banner */}
        {error && (
          <div style={{ marginBottom: '16px' }}>
            <Banner
              type={BannerTypes.ERROR}
              size={BannerSizes.SMALL}
              message={error}
            />
          </div>
        )}

        {/* Event Name */}
        <div style={{ marginBottom: '16px' }}>
          <Input
            type={InputTypes.TEXT}
            label="Event Name"
            placeholder="Enter a descriptive name for the event"
            value={formData.name}
            onChange={handleNameChange}
            hintText="A descriptive name for the event"
            isInvalid={!formData.name.trim() && error.includes('name')}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '24px' }}>
          <Input
            type={InputTypes.TEXT}
            label="Description"
            placeholder="Describe when this event is triggered"
            value={formData.description}
            onChange={handleDescriptionChange}
            multiline={true}
            multilineRowsCount={2}
            hintText="Describe when this event is triggered"
          />
        </div>

        <ContentDivider />

        {/* Event Parameters Section - Simple section */}
        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
          <Input
            type={InputTypes.TEXT}
            label="Event Parameters"
            value={parametersJson}
            onChange={handleParametersChange}
            multiline={true}
            multilineRowsCount={10}
            hintText='Each parameter should include type, required, and description fields'
            className="json-input"
          />
        </div>

        <ContentDivider />

        {/* Webhook Acknowledgement Section - Accordion with Toggle */}
        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
          <Accordion
            label="Webhook Acknowledgement"
            description="Configure how the system responds when this webhook is received"
            withToggleProps={acknowledgementToggleProps}
            size={AccordionSizes.MEDIUM}
            type={AccordionTypes.CARD}
          >
            <div style={{ padding: '16px' }}>
              {/* Response Type Radio Buttons */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#344054',
                  marginBottom: '8px'
                }}>
                  Response Type
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <Checkbox
                    type={CheckboxTypes.RADIO}
                    label="Basic Success Response"
                    checked={formData.acknowledgement_type === 'basic'}
                    onChange={() => handleAcknowledgementTypeChange('basic')}
                  />
                  <Checkbox
                    type={CheckboxTypes.RADIO}
                    label="Custom Success Response"
                    checked={formData.acknowledgement_type === 'custom'}
                    onChange={() => handleAcknowledgementTypeChange('custom')}
                  />
                </div>
              </div>

              {/* HTTP Status Code Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <DropdownSingleSelect
                  label="HTTP Status Code"
                  items={statusCodeItems}
                  placeholder="Select status code"
                  onSelect={handleStatusCodeSelect}
                />
                <div style={{
                  fontSize: '12px',
                  color: '#667085',
                  marginTop: '4px'
                }}>
                  HTTP status code to return when event is received
                </div>
              </div>

              {/* Custom Payload - only show when custom type is selected */}
              {formData.acknowledgement_type === 'custom' && (
                <div style={{ marginTop: '16px' }}>
                  <Input
                    type={InputTypes.TEXT}
                    label="Custom Response Payload (JSON)"
                    value={acknowledgementPayloadJson}
                    onChange={handleAcknowledgementPayloadChange}
                    multiline={true}
                    multilineRowsCount={8}
                    hintText="Static JSON payload to return in the acknowledgement response"
                    className="json-input"
                  />
                </div>
              )}
            </div>
          </Accordion>
        </div>

        {/* Modal Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          paddingBottom: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <Button
            label="Cancel"
            type={ButtonTypes.SECONDARY}
            size={ButtonSizes.MEDIUM}
            onClick={handleClose}
            disabled={saving}
          />
          <Button
            label={event ? 'Update Event' : 'Create Event'}
            type={ButtonTypes.PRIMARY}
            size={ButtonSizes.MEDIUM}
            onClick={handleSubmit}
            loading={saving}
            disabled={saving}
            renderIcon={getRenderIcon(event ? Save : Plus)}
          />
        </div>
      </div>

      <style>{`
        .event-form-modal .modal-content-wrapper {
          max-height: 70vh;
          overflow-y: auto;
        }

        .event-form-modal .json-input textarea,
        .event-form-modal .input-wrapper textarea {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 13px;
        }

        /* Webhook accordion styling - remove gap between header and content */
        .event-form-modal .accordion-cont.card [role="region"] {
          border: 1px solid #e5e7eb !important;
          border-top: none !important;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          background-color: #ffffff;
          margin-top: -1px !important;
          padding-top: 0 !important;
        }

        .event-form-modal .accordion-cont.card .accordion-header-icon {
          margin-bottom: 0 !important;
        }

        .event-form-modal .accordion-cont.card:has([aria-expanded="true"]) .accordion-header-icon {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          border-bottom: 1px solid #e5e7eb;
        }
      `}</style>
    </Modal>
  );
};

export default EventForm;
