import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  ModalTypes,
  Input,
  InputTypes,
  Checkbox,
  CheckboxTypes,
  CheckboxSizes,
  Toggle,
  ToggleSizes,
  ButtonTypes,
  DropdownMultiSelect,
  DropdownSingleSelect,
  Loading,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import { eventsApi } from '../services/api';

const SequenceForm = ({ open, onClose, onSave, onOpenBuilder, sequence = null, template = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sequence_type: 'custom',
    status: 'active',
    trigger_type: 'event',
    trigger_events: [],
    trigger_event_version: 'latest',
  });
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const modalId = useMemo(() => 'sequence-form-modal', []);

  // Event items state for multi-select dropdown
  const [eventItems, setEventItems] = useState([]);

  // Version items for single select dropdown
  const [versionItems, setVersionItems] = useState([
    { id: 'latest', label: 'Latest Version (Auto)', selected: true, helper: 'Always uses the most recent version' },
  ]);

  // Sequence type items for single select dropdown
  const [sequenceTypeItems, setSequenceTypeItems] = useState([
    { id: 'system', label: 'System Sequence', selected: false },
    { id: 'custom', label: 'Custom Sequence', selected: true },
  ]);

  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open]);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await eventsApi.getAll();
      setEvents(response.data);
      // Initialize event items with selected: false
      const initialEventItems = response.data.map((event) => ({
        id: event.id,
        label: event.name,
        selected: false,
        helper: `${event.event_type === 'system' ? 'System' : 'Custom'} • v${event.version || 1}`,
      }));
      setEventItems(initialEventItems);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadEventVersions = async (eventId) => {
    setLoadingVersions(true);
    try {
      // Mock data for demonstration
      const mockVersions = [
        { version: '1.0', created_at: '2024-01-01' },
        { version: '1.1', created_at: '2024-02-01' },
        { version: '2.0', created_at: '2024-03-01' },
      ];

      // Update version items
      const newVersionItems = [
        { id: 'latest', label: 'Latest Version (Auto)', selected: formData.trigger_event_version === 'latest', helper: 'Always uses the most recent version' },
        ...mockVersions.map((v) => ({
          id: v.version,
          label: `Version ${v.version}`,
          selected: formData.trigger_event_version === v.version,
          helper: `Created: ${v.created_at}`,
        })),
      ];
      setVersionItems(newVersionItems);
    } catch (err) {
      console.error('Error loading event versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    if (sequence) {
      const triggerEvents = Array.isArray(sequence.trigger_events)
        ? sequence.trigger_events
        : (sequence.trigger_events ? [sequence.trigger_events] : []);

      setFormData({
        name: sequence.name || '',
        description: sequence.description || '',
        sequence_type: sequence.sequence_type || 'custom',
        status: sequence.status || 'active',
        trigger_type: sequence.trigger_type || 'event',
        trigger_events: triggerEvents,
        trigger_event_version: sequence.trigger_event_version || 'latest',
      });

      // Update event items to reflect selected events
      setEventItems(prev => prev.map(item => ({
        ...item,
        selected: triggerEvents.includes(item.id)
      })));

      // Update sequence type items
      setSequenceTypeItems(prev => prev.map(item => ({
        ...item,
        selected: item.id === (sequence.sequence_type || 'custom')
      })));
    } else if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        sequence_type: 'custom',
        status: 'active',
        trigger_type: 'event',
        trigger_events: [],
        trigger_event_version: 'latest',
      });
      // Reset event items
      setEventItems(prev => prev.map(item => ({ ...item, selected: false })));
      setSequenceTypeItems(prev => prev.map(item => ({
        ...item,
        selected: item.id === 'custom'
      })));
    } else {
      setFormData({
        name: '',
        description: '',
        sequence_type: 'custom',
        status: 'active',
        trigger_type: 'event',
        trigger_events: [],
        trigger_event_version: 'latest',
      });
      // Reset event items
      setEventItems(prev => prev.map(item => ({ ...item, selected: false })));
      setSequenceTypeItems(prev => prev.map(item => ({
        ...item,
        selected: item.id === 'custom'
      })));
    }
    setError('');
  }, [sequence, template, open]);

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setFormData({ ...formData, description: e.target.value });
  };

  const handleTriggerTypeChange = (type) => {
    setFormData({ ...formData, trigger_type: type });
  };

  const handleEventSelect = (eventId) => {
    // onSelect callback receives the item ID directly
    const isCurrentlySelected = eventItems.find(item => item.id === eventId)?.selected;

    // Update event items - toggle the selected state
    setEventItems(prev => prev.map(item => ({
      ...item,
      selected: item.id === eventId ? !item.selected : item.selected
    })));

    // Update form data
    const newSelectedEvents = isCurrentlySelected
      ? formData.trigger_events.filter(id => id !== eventId)
      : [...formData.trigger_events, eventId];

    if (newSelectedEvents.length > 0 && !isCurrentlySelected) {
      loadEventVersions(newSelectedEvents[0]);
    }

    setFormData({
      ...formData,
      trigger_events: newSelectedEvents,
      trigger_event_version: newSelectedEvents.length > 0 ? formData.trigger_event_version : 'latest'
    });
  };

  const handleVersionSelect = (itemId) => {
    setVersionItems(prev => prev.map(item => ({
      ...item,
      selected: item.id === itemId
    })));
    setFormData({ ...formData, trigger_event_version: itemId });
  };

  const handleStatusToggle = () => {
    setFormData({
      ...formData,
      status: formData.status === 'active' ? 'inactive' : 'active',
    });
  };

  const handleSequenceTypeSelect = (itemId) => {
    setSequenceTypeItems(prev => prev.map(item => ({
      ...item,
      selected: item.id === itemId
    })));
    setFormData({ ...formData, sequence_type: itemId });
  };

  const handleSubmit = async () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Sequence name is required');
      return;
    }

    if (formData.trigger_type === 'event' && (!Array.isArray(formData.trigger_events) || formData.trigger_events.length === 0)) {
      setError('Please select at least one trigger event');
      return;
    }

    try {
      if (!sequence) {
        onOpenBuilder(formData);
        onClose();
      } else {
        await onSave(formData);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save sequence');
    }
  };

  const handleButtonClick = (buttonId) => {
    if (buttonId === 'cancel') {
      onClose();
    } else if (buttonId === 'submit') {
      handleSubmit();
    }
  };

  const modalButtons = [
    {
      id: 'cancel',
      type: ButtonTypes.SECONDARY,
      label: 'Cancel',
    },
    {
      id: 'submit',
      type: ButtonTypes.PRIMARY,
      label: sequence ? 'Update' : 'Create Sequence',
      disabled: formData.trigger_type === 'schedule' && !sequence,
    },
  ];

  return (
    <Modal
      open={open}
      type={ModalTypes.WITH_HEIGHT_TRANSITIONS}
      header={sequence ? 'Edit Sequence' : 'Create New Sequence'}
      onClose={onClose}
      showClose={true}
      buttons={modalButtons}
      onButtonClick={handleButtonClick}
      id={modalId}
      className="sequence-form-modal sequence-form-modal--wide"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0', minWidth: '500px' }}>
        {error && (
          <Banner
            type={BannerTypes.ERROR}
            size={BannerSizes.SMALL}
            message={error}
          />
        )}

        {/* Sequence Name */}
        <Input
          type={InputTypes.TEXT}
          label="Sequence Name"
          placeholder="Enter a descriptive name for the sequence"
          value={formData.name}
          onChange={handleNameChange}
          hintText="A descriptive name for the sequence"
          isRequired={true}
        />

        {/* Description */}
        <Input
          multiline={true}
          multilineRowsCount={3}
          label="Description"
          placeholder="Describe what this sequence does"
          value={formData.description}
          onChange={handleDescriptionChange}
          hintText="Describe what this sequence does"
        />

        {/* Trigger Type Selection - Only for new sequences */}
        {!sequence && (
          <>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#344054' }}>
                Sequence Trigger
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Checkbox
                  type={CheckboxTypes.RADIO}
                  label="Trigger on Event"
                  hintText="Execute this sequence when specific events occur"
                  checked={formData.trigger_type === 'event'}
                  onChange={() => handleTriggerTypeChange('event')}
                  size={CheckboxSizes.MEDIUM}
                />
                <Checkbox
                  type={CheckboxTypes.RADIO}
                  label="Trigger on Schedule"
                  hintText="Execute this sequence on a scheduled basis (Coming Soon)"
                  checked={formData.trigger_type === 'schedule'}
                  onChange={() => handleTriggerTypeChange('schedule')}
                  size={CheckboxSizes.MEDIUM}
                />
              </div>
            </div>

            {/* Event Selection - Multi-select Dropdown */}
            {formData.trigger_type === 'event' && (
              <div className="sequence-form-dropdown">
                {loadingEvents ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Loading loaderMsgProps={{ loaderMsg: 'Loading events...' }} />
                  </div>
                ) : events.length === 0 ? (
                  <>
                    <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#344054' }}>
                      Select Events <span style={{ color: '#ef4444' }}>*</span>
                    </div>
                    <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px' }}>
                      No events available
                    </div>
                  </>
                ) : (
                  <DropdownMultiSelect
                    key={`events-${formData.trigger_events.join(',')}`}
                    label="Select Events *"
                    items={eventItems}
                    placeholder="Select trigger events..."
                    onSelect={handleEventSelect}
                    withSearch={true}
                    withClearSelection={true}
                  />
                )}
                {formData.trigger_events.length === 0 && !loadingEvents && events.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
                    Please select at least one event
                  </div>
                )}
              </div>
            )}

            {/* Event Version Selection */}
            {formData.trigger_type === 'event' && Array.isArray(formData.trigger_events) && formData.trigger_events.length > 0 && (
              <div className="sequence-form-dropdown">
                <DropdownSingleSelect
                  label="Select Event Version"
                  items={versionItems}
                  placeholder="Select a version..."
                  onSelect={handleVersionSelect}
                  disabled={loadingVersions}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                  Select a specific version or use the latest version automatically
                </div>
              </div>
            )}

            {/* Schedule Coming Soon */}
            {formData.trigger_type === 'schedule' && (
              <Banner
                type={BannerTypes.INFO}
                size={BannerSizes.SMALL}
                message="Schedule-based triggers are coming soon. This feature is currently under development."
              />
            )}
          </>
        )}

        {/* Edit Mode - Sequence Type and Status */}
        {sequence && (
          <>
            <div className="sequence-form-dropdown">
              <DropdownSingleSelect
                label="Sequence Type"
                items={sequenceTypeItems}
                placeholder="Select sequence type..."
                onSelect={handleSequenceTypeSelect}
              />
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                Select whether this is a system or custom sequence
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <Toggle
                checked={formData.status === 'active'}
                onChange={handleStatusToggle}
                size={ToggleSizes.MEDIUM}
              />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#344054' }}>
                {formData.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SequenceForm;
