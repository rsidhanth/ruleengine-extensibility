import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Container } from '@mui/material';
import {
  PageHeader,
  Button,
  ButtonTypes,
  ButtonSizes,
  Table,
  ColumnTypes,
  RowOverrides,
  Toggle,
  ToggleSizes,
  Badge,
  BadgeTypes,
  BadgeSizes,
  Loading,
  EmptyState,
  Tooltip,
  Chip,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Plus, Upload, Edit2, Eye, Play, Copy, Trash2, Download, AlertCircle } from 'react-feather';
import { sequencesApi } from '../services/api';
import SequenceForm from '../components/SequenceForm';
import SequenceBuilder from '../components/SequenceBuilder';
import SequenceTypeSelector from '../components/SequenceTypeSelector';
import TemplateSelector from '../components/TemplateSelector';
import SequenceTestModal from '../components/SequenceTestModal';
import ImportModal from '../components/ImportModal';
import NameConflictDialog from '../components/NameConflictDialog';
import DependencyErrorDialog from '../components/DependencyErrorDialog';

// Icon render helper
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

// Helper to extract trigger events from flow_nodes
const getTriggerEvents = (sequence) => {
  const flowNodes = sequence.flow_nodes || [];
  const triggerNode = flowNodes.find(node => node.data?.nodeType === 'event_trigger');
  return triggerNode?.data?.triggerEvents || [];
};

const Sequences = () => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderData, setBuilderData] = useState(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingSequence, setTestingSequence] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [nameConflictData, setNameConflictData] = useState(null);
  const [dependencyErrorData, setDependencyErrorData] = useState(null);
  const [importDataCache, setImportDataCache] = useState(null);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await sequencesApi.getAll();
      setSequences(response.data);
    } catch (err) {
      setError('Failed to load sequences');
      console.error('Error loading sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedSequence(null);
    setSelectedTemplate(null);
    setShowTypeSelector(true);
  };

  const handleTypeSelect = (type) => {
    setShowTypeSelector(false);
    if (type === 'template') {
      setShowTemplateSelector(true);
    } else {
      setShowForm(true);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowForm(true);
  };

  const handleEdit = useCallback((sequence) => {
    setBuilderData(sequence);
    setShowBuilder(true);
  }, []);

  const handleView = useCallback((sequence) => {
    setBuilderData(sequence);
    setShowBuilder(true);
  }, []);

  const handleSave = async (data) => {
    try {
      if (selectedSequence) {
        await sequencesApi.update(selectedSequence.id, data);
      } else {
        await sequencesApi.create(data);
      }
      setShowForm(false);
      loadSequences();
    } catch (err) {
      console.error('Error saving sequence:', err);
      throw err;
    }
  };

  const handleDelete = useCallback(async (sequence) => {
    if (window.confirm('Are you sure you want to delete this sequence?')) {
      try {
        await sequencesApi.delete(sequence.id);
        loadSequences();
        setSuccessMessage('Sequence deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError('Failed to delete sequence');
        console.error('Error deleting sequence:', err);
      }
    }
  }, []);

  const handleDuplicate = useCallback(async (sequence) => {
    try {
      const duplicatedData = {
        name: `${sequence.name} (Copy)`,
        description: sequence.description,
        sequence_type: 'custom',
        status: sequence.status,
      };
      await sequencesApi.create(duplicatedData);
      loadSequences();
      setSuccessMessage('Sequence duplicated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to duplicate sequence');
      console.error('Error duplicating sequence:', err);
    }
  }, []);

  const handleOpenBuilder = (sequenceData) => {
    const builderPayload = selectedTemplate
      ? { ...sequenceData, template: selectedTemplate }
      : sequenceData;
    setBuilderData(builderPayload);
    setShowBuilder(true);
  };

  const handleBuilderSave = (workflowData) => {
    setShowBuilder(false);
    setBuilderData(null);
    loadSequences();
    setSuccessMessage(workflowData.id ? 'Sequence updated successfully!' : 'Sequence created successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setBuilderData(null);
  };

  const handleToggleStatus = useCallback(async (sequence) => {
    try {
      await sequencesApi.toggleStatus(sequence.id);
      loadSequences();
      const newStatus = sequence.status === 'active' ? 'inactive' : 'active';
      setSuccessMessage(`Sequence ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to toggle sequence status');
      console.error('Error toggling sequence status:', err);
    }
  }, []);

  const handleTest = useCallback((sequence) => {
    setTestingSequence(sequence);
    setTestModalOpen(true);
  }, []);

  const handleExecute = useCallback(async (sequence) => {
    if (sequence.status !== 'active') {
      setError('Sequence must be active to execute');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const result = await sequencesApi.execute(sequence.id, {
        test: true,
        timestamp: new Date().toISOString(),
      });

      if (result.data.success) {
        setSuccessMessage(`Sequence executed successfully! Execution ID: ${result.data.execution_id}`);
      } else {
        setError(`Execution failed: ${result.data.error}`);
      }
      setTimeout(() => {
        setSuccessMessage('');
        setError('');
      }, 5000);
    } catch (err) {
      setError('Failed to execute sequence');
      console.error('Error executing sequence:', err);
    }
  }, []);

  const handleExport = useCallback(async (sequence) => {
    try {
      const response = await sequencesApi.export(sequence.id);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sequence-${sequence.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage('Sequence exported successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to export sequence');
    }
  }, []);

  const handleImport = async (file, overrides = {}) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      setImportDataCache(importData);

      const validationResponse = await sequencesApi.validateImport(importData);

      if (!validationResponse.data.valid) {
        setDependencyErrorData(validationResponse.data.missing_dependencies);
        setImportModalOpen(false);
        return;
      }

      const requestData = {
        ...importData,
        ...overrides
      };

      const response = await sequencesApi.import(requestData);

      if (response.data.success) {
        setSuccessMessage('Sequence imported successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadSequences();
        setImportDataCache(null);
        setImportModalOpen(false);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;

      if (errorType === 'name_conflict') {
        setNameConflictData({
          data: err.response.data,
          originalData: importDataCache || JSON.parse(await file.text())
        });
        setImportModalOpen(false);
      } else if (errorType === 'missing_dependencies') {
        setDependencyErrorData(err.response.data.details);
        setImportModalOpen(false);
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    }
  };

  const handleConflictResolve = async (newName) => {
    try {
      const requestData = {
        ...importDataCache,
        name_override: newName
      };

      const response = await sequencesApi.import(requestData);

      if (response.data.success) {
        setSuccessMessage('Sequence imported successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadSequences();
        setImportDataCache(null);
      }
    } catch (err) {
      const errorType = err.response?.data?.error;
      if (errorType === 'name_conflict') {
        setNameConflictData({
          data: err.response.data,
          originalData: importDataCache
        });
      } else if (errorType === 'missing_dependencies') {
        setDependencyErrorData(err.response.data.details);
      } else {
        setError(err.response?.data?.message || 'Import failed');
        setImportDataCache(null);
      }
    } finally {
      setNameConflictData(null);
    }
  };

  // Table columns configuration
  const columns = useMemo(() => [
    {
      id: 'name',
      type: ColumnTypes.CUSTOM,
      label: 'Sequence Name',
      accessor: '_nameDisplay',
      sortable: true,
      width: '30%',
    },
    {
      id: 'sequence_id',
      type: ColumnTypes.CUSTOM,
      label: 'Sequence ID',
      accessor: '_sequenceIdDisplay',
      sortable: false,
      width: '20%',
    },
    {
      id: 'trigger_events',
      type: ColumnTypes.CUSTOM,
      label: 'Trigger Event',
      accessor: '_triggerEventsDisplay',
      sortable: false,
      width: '25%',
    },
    {
      id: 'status',
      type: ColumnTypes.CUSTOM,
      label: 'Status',
      accessor: '_statusToggle',
      sortable: false,
      width: '15%',
    },
  ], []);

  // Action items for table rows (first 2 visible, rest in kebab)
  const actionItems = useMemo(() => [
    {
      id: 'edit',
      label: 'Edit',
      renderIcon: getRenderIcon(Edit2),
      tooltipProps: { description: 'Edit sequence' },
    },
    {
      id: 'view',
      label: 'View',
      renderIcon: getRenderIcon(Eye),
      tooltipProps: { description: 'View sequence' },
    },
    {
      id: 'test',
      label: 'Test',
      renderIcon: getRenderIcon(AlertCircle),
      tooltipProps: { description: 'Test sequence' },
    },
    {
      id: 'execute',
      label: 'Execute',
      renderIcon: getRenderIcon(Play),
      tooltipProps: { description: 'Execute sequence' },
    },
    {
      id: 'export',
      label: 'Export',
      renderIcon: getRenderIcon(Download),
      tooltipProps: { description: 'Export sequence' },
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      renderIcon: getRenderIcon(Copy),
      tooltipProps: { description: 'Duplicate sequence' },
    },
    {
      id: 'delete',
      label: 'Delete',
      renderIcon: getRenderIcon(Trash2),
      tooltipProps: { description: 'Delete sequence' },
    },
  ], []);

  // Handle clicking on sequence name - opens builder
  const handleSequenceNameClick = useCallback((sequence) => {
    handleEdit(sequence);
  }, [handleEdit]);

  // Transform data for table display
  const tableData = useMemo(() => {
    return sequences.map((sequence) => ({
      ...sequence,
      _nameDisplay: (
        <div>
          <div
            style={{
              fontWeight: 500,
              color: '#7f56d9',
              cursor: 'pointer',
            }}
            onClick={() => handleSequenceNameClick(sequence)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSequenceNameClick(sequence)}
          >
            {sequence.name}
          </div>
          {sequence.description && (
            <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>
              {sequence.description}
            </div>
          )}
        </div>
      ),
      _sequenceIdDisplay: (
        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#344054' }}>
          {sequence.sequence_id}
        </span>
      ),
      _triggerEventsDisplay: (() => {
        const triggerEvents = getTriggerEvents(sequence);
        if (triggerEvents.length === 0) {
          return (
            <span style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
              No trigger events
            </span>
          );
        }
        const firstEvent = triggerEvents[0];
        const remainingCount = triggerEvents.length - 1;
        const allEventNames = triggerEvents.map(e => e.name).join(', ');

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#344054' }}>
              {firstEvent.name}
            </span>
            {remainingCount > 0 && (
              <Tooltip description={allEventNames}>
                <Chip
                  label={`+${remainingCount}`}
                  style={{
                    height: '22px',
                    fontSize: '12px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                  }}
                />
              </Tooltip>
            )}
          </div>
        );
      })(),
      _statusToggle: (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStatus(sequence);
          }}
        >
          <Toggle
            checked={sequence.status === 'active'}
            onChange={() => {}}
            size={ToggleSizes.SMALL}
          />
          <Badge
            label={sequence.status === 'active' ? 'Active' : 'Inactive'}
            type={sequence.status === 'active' ? BadgeTypes.SUCCESS : BadgeTypes.GRAY}
            size={BadgeSizes.SMALL}
          />
        </div>
      ),
      // Disable execute action for inactive sequences
      [RowOverrides.DISABLED_ACTIONS]: sequence.status !== 'active' ? ['execute'] : [],
    }));
  }, [sequences, handleToggleStatus, handleSequenceNameClick]);

  // Handle row action
  const handleAction = useCallback((rowId, actionId, dataItem) => {
    const sequence = sequences.find(s => s.id === rowId);
    if (!sequence) return;

    switch (actionId) {
      case 'edit':
        handleEdit(sequence);
        break;
      case 'view':
        handleView(sequence);
        break;
      case 'test':
        handleTest(sequence);
        break;
      case 'execute':
        handleExecute(sequence);
        break;
      case 'export':
        handleExport(sequence);
        break;
      case 'duplicate':
        handleDuplicate(sequence);
        break;
      case 'delete':
        handleDelete(sequence);
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  }, [sequences, handleEdit, handleView, handleTest, handleExecute, handleExport, handleDuplicate, handleDelete]);

  // Empty state props
  const emptyStateProps = useMemo(() => ({
    text: 'No sequences found',
    supportingText: 'Create your first sequence to get started',
  }), []);

  // PageHeader buttons configuration
  const headerButtons = [
    {
      id: 'import',
      label: 'Import',
      title: 'Import sequence from JSON file',
      type: ButtonTypes.SECONDARY,
      renderIcon: () => <Upload size={20} stroke="currentColor" />,
    },
    {
      id: 'create',
      label: 'Create Sequence',
      title: 'Create a new sequence',
      type: ButtonTypes.PRIMARY,
      renderIcon: () => <Plus size={20} stroke="currentColor" />,
    },
  ];

  // Handle header button clicks
  const handleHeaderButtonClick = (buttonId) => {
    switch (buttonId) {
      case 'import':
        setImportModalOpen(true);
        break;
      case 'create':
        handleCreate();
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading sequences...' }} />
      </Box>
    );
  }

  if (showBuilder && builderData) {
    return (
      <SequenceBuilder
        sequenceData={builderData}
        onSave={handleBuilderSave}
        onClose={handleBuilderClose}
      />
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <PageHeader
          text="Sequences"
          supportingText="Manage workflow sequences for automated processes"
          buttons={headerButtons}
          onButtonClick={handleHeaderButtonClick}
        />
      </Box>

      {/* Error Banner */}
      {error && (
        <Box sx={{ mb: 2 }}>
          <Banner
            type={BannerTypes.ERROR}
            size={BannerSizes.SMALL}
            message={error}
          />
        </Box>
      )}

      {/* Success Banner */}
      {successMessage && (
        <Box sx={{ mb: 2 }}>
          <Banner
            type={BannerTypes.SUCCESS}
            size={BannerSizes.SMALL}
            message={successMessage}
          />
        </Box>
      )}

      {/* Table with CSS fixes for column stability */}
      <Box sx={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        // Fix column gap and action column width issues
        '& .tbl-cont': {
          borderTop: 'none',
          '& table': {
            borderCollapse: 'collapse',
            borderSpacing: 0,
            tableLayout: 'fixed',
          },
          '& .tbl-th, & .tbl-td': {
            borderRight: 'none',
          },
          // Fix action column width to prevent layout shift on hover
          '& .tbl-row-action-items-cont': {
            minWidth: '130px',
            width: '130px',
            '& .trai-wrapper': {
              '& .tbl-row-action-item:not(.kebab)': {
                // Always display but invisible until hover (prevents layout shift)
                display: 'flex !important',
                opacity: 0,
                pointerEvents: 'none',
              },
            },
          },
          // On row hover, make action items visible and clickable
          '& table tr:hover .tbl-row-action-items-cont .trai-wrapper .tbl-row-action-item:not(.kebab)': {
            opacity: 1,
            pointerEvents: 'auto',
          },
        },
      }}>
        <Table
          columns={columns}
          data={tableData}
          actionItems={actionItems}
          maxActions={2}
          onAction={handleAction}
          selectable={false}
          showPagination={false}
          emptyStateProps={emptyStateProps}
        />
      </Box>

      {/* Modals */}
      <SequenceTypeSelector
        open={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelectType={handleTypeSelect}
      />

      <TemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      <SequenceForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        onOpenBuilder={handleOpenBuilder}
        sequence={selectedSequence}
        template={selectedTemplate}
      />

      <SequenceTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        sequence={testingSequence}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportDataCache(null);
        }}
        onImport={handleImport}
        title="Import Sequence"
      />

      <NameConflictDialog
        open={!!nameConflictData}
        onClose={() => {
          setNameConflictData(null);
        }}
        onConfirm={handleConflictResolve}
        conflictData={nameConflictData?.data}
      />

      <DependencyErrorDialog
        open={!!dependencyErrorData}
        onClose={() => {
          setDependencyErrorData(null);
          setImportDataCache(null);
        }}
        missingDependencies={dependencyErrorData}
      />
    </Container>
  );
};

export default Sequences;
