import React, { useState, useEffect, useMemo } from 'react';
import { Box, Container } from '@mui/material';
import {
  Button,
  ButtonTypes,
  ButtonSizes,
  Table,
  ColumnTypes,
  Badge,
  BadgeTypes,
  BadgeSizes,
  Loading,
  Modal,
  ModalTypes,
  Accordion,
  AccordionTypes,
  AccordionSizes,
  Card,
  CardTypes,
  PageHeader,
} from '@leegality/leegality-react-component-library';
import Banner, { BannerTypes, BannerSizes } from '@leegality/leegality-react-component-library/dist/banner';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import { Eye, ArrowLeft, X } from 'react-feather';
import { v4 as uuidv4 } from 'uuid';
import { sequenceExecutionsApi, executionLogsApi } from '../services/api';

// Icon render helper
const getRenderIcon = (IconComponent) =>
  IconComponent ? ({ size, color }) => <Icon icon={IconComponent} size={size} color={color} /> : null;

// Status badge mapping
const getStatusBadgeType = (status) => {
  switch (status) {
    case 'running': return BadgeTypes.PRIMARY;
    case 'completed': return BadgeTypes.SUCCESS;
    case 'failed': return BadgeTypes.ERROR;
    case 'cancelled': return BadgeTypes.DEFAULT;
    case 'started': return BadgeTypes.DEFAULT;
    case 'skipped': return BadgeTypes.DEFAULT;
    default: return BadgeTypes.DEFAULT;
  }
};

// Node type badge mapping
const getNodeTypeBadgeType = (nodeType) => {
  switch (nodeType) {
    case 'trigger': return BadgeTypes.INFO;
    case 'action': return BadgeTypes.PRIMARY;
    case 'custom_rule': return BadgeTypes.WARNING;
    case 'condition': return BadgeTypes.DEFAULT;
    default: return BadgeTypes.DEFAULT;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDuration = (ms) => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
};

const formatJSON = (data) => {
  if (!data) return 'N/A';
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
};

const ExecutionDetails = ({ executionId, onBack }) => {
  const [execution, setExecution] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const modalId = useMemo(() => uuidv4(), []);

  useEffect(() => {
    loadExecutionDetails();
  }, [executionId]);

  const loadExecutionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const executionsResponse = await sequenceExecutionsApi.getAll();
      const foundExecution = executionsResponse.data.find(
        (e) => e.execution_id === executionId
      );

      if (!foundExecution) {
        setError('Execution not found');
        setLoading(false);
        return;
      }

      setExecution(foundExecution);

      const logsResponse = await executionLogsApi.getAll({
        sequence_execution: foundExecution.id,
      });

      const filteredLogs = logsResponse.data.filter(
        (log) => log.sequence_execution === foundExecution.id
      );

      setLogs(filteredLogs);
    } catch (err) {
      console.error('Error loading execution details:', err);
      setError('Failed to load execution details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsModalOpen(false);
    setSelectedLog(null);
  };

  // Handle table actions
  const handleAction = (rowId, actionId, dataItem) => {
    const log = logs.find(l => l.id === rowId);
    if (!log) return;

    if (actionId === 'view') {
      handleViewDetails(log);
    }
  };

  // Table action items
  const actionItems = useMemo(() => [
    { id: 'view', label: 'View Details', renderIcon: getRenderIcon(Eye), tooltipProps: { description: 'View node details' } },
  ], []);

  // Table columns for logs
  const columns = useMemo(() => [
    {
      id: 'node_id',
      label: 'Node ID',
      accessor: '_nodeIdDisplay',
      type: ColumnTypes.CUSTOM,
      width: 150,
    },
    {
      id: 'node_type',
      label: 'Node Type',
      accessor: '_nodeTypeBadge',
      type: ColumnTypes.BADGE,
      width: 120,
    },
    {
      id: 'node_name',
      label: 'Node Name',
      accessor: '_nodeNameDisplay',
      type: ColumnTypes.CUSTOM,
      width: 200,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: '_statusBadge',
      type: ColumnTypes.BADGE,
      width: 100,
    },
    {
      id: 'started_at',
      label: 'Started At',
      accessor: '_startedAtDisplay',
      type: ColumnTypes.CUSTOM,
      width: 180,
    },
    {
      id: 'completed_at',
      label: 'Completed At',
      accessor: '_completedAtDisplay',
      type: ColumnTypes.CUSTOM,
      width: 180,
    },
    {
      id: 'duration_ms',
      label: 'Duration',
      accessor: '_durationDisplay',
      type: ColumnTypes.CUSTOM,
      width: 100,
    },
  ], []);

  // Transform data for table
  const tableData = useMemo(() => {
    return logs.map(log => ({
      id: log.id.toString(),
      ...log,
      // Node ID display
      _nodeIdDisplay: (
        <code style={{ fontSize: '11px', color: '#344054', backgroundColor: '#F9FAFB', padding: '2px 6px', borderRadius: '4px' }}>
          {log.node_id}
        </code>
      ),
      // Node type badge
      _nodeTypeBadge: {
        label: log.node_type ? log.node_type.replace('_', ' ').toUpperCase() : 'N/A',
        type: getNodeTypeBadgeType(log.node_type),
        size: BadgeSizes.SMALL,
      },
      // Node name display
      _nodeNameDisplay: (
        <span style={{ fontWeight: 500, color: '#101828', fontSize: '14px' }}>
          {log.node_name || log.node_id}
        </span>
      ),
      // Status badge
      _statusBadge: {
        label: log.status ? log.status.charAt(0).toUpperCase() + log.status.slice(1) : 'N/A',
        type: getStatusBadgeType(log.status),
        size: BadgeSizes.SMALL,
      },
      // Started at display
      _startedAtDisplay: (
        <span style={{ fontSize: '12px', color: '#344054' }}>{formatDate(log.started_at)}</span>
      ),
      // Completed at display
      _completedAtDisplay: (
        <span style={{ fontSize: '12px', color: '#344054' }}>{log.completed_at ? formatDate(log.completed_at) : '-'}</span>
      ),
      // Duration display
      _durationDisplay: (
        <span style={{ fontSize: '14px', color: '#344054' }}>{formatDuration(log.duration_ms)}</span>
      ),
    }));
  }, [logs]);

  // Render trigger details
  const renderTriggerDetails = (log) => {
    const inputData = log.input_data || {};
    const triggerSource = inputData.trigger_source || {};

    return (
      <div style={{ marginTop: '16px' }}>
        <Accordion
          label="Event Information"
          type={AccordionTypes.CARD}
          size={AccordionSizes.MEDIUM}
          defaultExpanded
        >
          <div style={{ padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600, width: '20%' }}>Event ID</td>
                  <td style={{ padding: '8px 0' }}>{inputData.event_id || 'N/A'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600 }}>Event Name</td>
                  <td style={{ padding: '8px 0' }}>{inputData.event_name || 'N/A'}</td>
                </tr>
                {triggerSource.ip && (
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>IP Address</td>
                    <td style={{ padding: '8px 0' }}>{triggerSource.ip}</td>
                  </tr>
                )}
                {triggerSource.os && (
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Operating System</td>
                    <td style={{ padding: '8px 0' }}>{triggerSource.os}</td>
                  </tr>
                )}
                {triggerSource.device && (
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Device Type</td>
                    <td style={{ padding: '8px 0' }}>{triggerSource.device}</td>
                  </tr>
                )}
                {triggerSource.browser && (
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Browser</td>
                    <td style={{ padding: '8px 0' }}>{triggerSource.browser}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <div style={{ marginTop: '12px' }}>
          <Accordion
            label="Trigger Payload"
            type={AccordionTypes.CARD}
            size={AccordionSizes.MEDIUM}
            defaultExpanded
          >
            <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
              {formatJSON(inputData.trigger_payload)}
            </pre>
          </Accordion>
        </div>
      </div>
    );
  };

  // Render action details
  const renderActionDetails = (log) => {
    const outputData = log.output_data || {};
    const requestDetails = outputData.request_details || {};
    const inputData = log.input_data || {};

    return (
      <div style={{ marginTop: '16px' }}>
        <Accordion
          label="Request Details"
          type={AccordionTypes.CARD}
          size={AccordionSizes.MEDIUM}
          defaultExpanded
        >
          <div style={{ padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600, width: '20%' }}>Method</td>
                  <td style={{ padding: '8px 0' }}>{requestDetails.method || 'N/A'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600 }}>URL</td>
                  <td style={{ padding: '8px 0', wordBreak: 'break-all' }}>{requestDetails.url || outputData.url || 'N/A'}</td>
                </tr>
                {requestDetails.headers && Object.keys(requestDetails.headers).length > 0 && (
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600, verticalAlign: 'top' }}>Headers</td>
                    <td style={{ padding: '8px 0' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{formatJSON(requestDetails.headers)}</pre></td>
                  </tr>
                )}
                {requestDetails.params && Object.keys(requestDetails.params).length > 0 && (
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600, verticalAlign: 'top' }}>Query Params</td>
                    <td style={{ padding: '8px 0' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{formatJSON(requestDetails.params)}</pre></td>
                  </tr>
                )}
                {requestDetails.body && Object.keys(requestDetails.body).length > 0 && (
                  <tr>
                    <td style={{ padding: '8px 0', fontWeight: 600, verticalAlign: 'top' }}>Request Body</td>
                    <td style={{ padding: '8px 0' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{formatJSON(requestDetails.body)}</pre></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <div style={{ marginTop: '12px' }}>
          <Accordion
            label="Response Details"
            type={AccordionTypes.CARD}
            size={AccordionSizes.MEDIUM}
            defaultExpanded
          >
            <div style={{ padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600, width: '20%' }}>Status Code</td>
                    <td style={{ padding: '8px 0' }}>
                      <Badge
                        type={outputData.status_code >= 200 && outputData.status_code < 300 ? BadgeTypes.SUCCESS : BadgeTypes.ERROR}
                        size={BadgeSizes.SMALL}
                        label={outputData.status_code || 'N/A'}
                      />
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>Response Time</td>
                    <td style={{ padding: '8px 0' }}>{formatDuration(outputData.response_time_ms)}</td>
                  </tr>
                  {outputData.headers && Object.keys(outputData.headers).length > 0 && (
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, verticalAlign: 'top' }}>Response Headers</td>
                      <td style={{ padding: '8px 0' }}><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{formatJSON(outputData.headers)}</pre></td>
                    </tr>
                  )}
                  {outputData.body && (
                    <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, verticalAlign: 'top' }}>Response Body</td>
                      <td style={{ padding: '8px 0' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                          {formatJSON(outputData.body)}
                        </pre>
                      </td>
                    </tr>
                  )}
                  {outputData.error_message && (
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 600, verticalAlign: 'top' }}>Error Message</td>
                      <td style={{ padding: '8px 0', color: '#EF4444' }}>{outputData.error_message}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Accordion>
        </div>

        {inputData.actionConfig && (
          <div style={{ marginTop: '12px' }}>
            <Accordion
              label="Node Configuration"
              type={AccordionTypes.CARD}
              size={AccordionSizes.MEDIUM}
            >
              <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
                {formatJSON(inputData)}
              </pre>
            </Accordion>
          </div>
        )}
      </div>
    );
  };

  // Render custom rule details
  const renderCustomRuleDetails = (log) => {
    const outputData = log.output_data || {};
    const inputData = log.input_data || {};
    const customRuleConfig = inputData.customRuleConfig || {};

    return (
      <div style={{ marginTop: '16px' }}>
        {customRuleConfig.code && (
          <Accordion
            label="DSL Code"
            type={AccordionTypes.CARD}
            size={AccordionSizes.MEDIUM}
            defaultExpanded
          >
            <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#F5F5F5', borderRadius: '4px' }}>
              {customRuleConfig.code}
            </pre>
          </Accordion>
        )}

        <div style={{ marginTop: '12px' }}>
          <Accordion
            label="Execution Result"
            type={AccordionTypes.CARD}
            size={AccordionSizes.MEDIUM}
            defaultExpanded
          >
            <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
              {formatJSON(outputData)}
            </pre>
          </Accordion>
        </div>
      </div>
    );
  };

  // Render condition details
  const renderConditionDetails = (log) => {
    const outputData = log.output_data || {};
    const inputData = log.input_data || {};

    return (
      <div style={{ marginTop: '16px' }}>
        <Accordion
          label="Condition Configuration"
          type={AccordionTypes.CARD}
          size={AccordionSizes.MEDIUM}
          defaultExpanded
        >
          <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
            {formatJSON(inputData.conditionSets || inputData.condition)}
          </pre>
        </Accordion>

        <div style={{ marginTop: '12px' }}>
          <Accordion
            label="Evaluation Result"
            type={AccordionTypes.CARD}
            size={AccordionSizes.MEDIUM}
            defaultExpanded
          >
            <div style={{ padding: '16px' }}>
              <span style={{ fontSize: '14px' }}>
                Condition evaluated to: <strong style={{ color: outputData.result ? '#10B981' : '#EF4444' }}>{outputData.result ? 'TRUE' : 'FALSE'}</strong>
              </span>
            </div>
          </Accordion>
        </div>
      </div>
    );
  };

  // Render node details based on type
  const renderNodeDetails = (log) => {
    switch (log.node_type) {
      case 'trigger':
        return renderTriggerDetails(log);
      case 'action':
        return renderActionDetails(log);
      case 'custom_rule':
        return renderCustomRuleDetails(log);
      case 'condition':
        return renderConditionDetails(log);
      default:
        return (
          <div style={{ marginTop: '16px' }}>
            <Accordion
              label="Output Data"
              type={AccordionTypes.CARD}
              size={AccordionSizes.MEDIUM}
              defaultExpanded
            >
              <pre style={{ margin: 0, padding: '16px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
                {formatJSON(log.output_data)}
              </pre>
            </Accordion>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Loading loaderMsgProps={{ loaderMsg: 'Loading execution details...' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Banner
          type={BannerTypes.ERROR}
          size={BannerSizes.SMALL}
          message={error}
        />
      </Container>
    );
  }

  if (!execution) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Banner
          type={BannerTypes.WARNING}
          size={BannerSizes.SMALL}
          message="Execution not found"
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 2 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: '#7f56d9',
            cursor: 'pointer',
            padding: '4px 0',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back to Execution Logs
        </button>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {execution.sequence_name} › Execution Details
        </div>
      </Box>

      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <PageHeader
          text="Execution Details"
          supportingText={`${execution.sequence_name} - ${execution.execution_id}`}
        />
        <Badge
          type={getStatusBadgeType(execution.status)}
          size={BadgeSizes.MEDIUM}
          label={execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
        />
      </Box>

      {/* Execution Summary */}
      <Box sx={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        p: 3,
        mb: 3,
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#101828', margin: '0 0 16px 0' }}>
          Execution Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#667085', marginBottom: '4px' }}>Sequence</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#101828' }}>{execution.sequence_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#667085', marginBottom: '4px' }}>Execution ID</div>
            <code style={{ fontSize: '12px', color: '#344054', backgroundColor: '#F9FAFB', padding: '2px 6px', borderRadius: '4px' }}>
              {execution.execution_id}
            </code>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#667085', marginBottom: '4px' }}>Started At</div>
            <div style={{ fontSize: '14px', color: '#344054' }}>{formatDate(execution.started_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#667085', marginBottom: '4px' }}>Duration</div>
            <div style={{ fontSize: '14px', color: '#344054' }}>{formatDuration(execution.duration_ms)}</div>
          </div>
          {execution.event_name && (
            <div>
              <div style={{ fontSize: '12px', color: '#667085', marginBottom: '4px' }}>Triggered By</div>
              <div style={{ fontSize: '14px', color: '#344054' }}>{execution.event_name}</div>
            </div>
          )}
        </div>
      </Box>

      {/* Node Execution Logs */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#101828', margin: '0 0 16px 0' }}>
        Node Execution Logs
      </h2>
      <Box sx={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        '& .tbl-cont': {
          borderTop: 'none',
          '& table': {
            borderCollapse: 'collapse',
            borderSpacing: 0,
          },
          '& .tbl-th, & .tbl-td': {
            borderRight: 'none',
          },
          '& .tbl-row-action-items-cont': {
            minWidth: '80px',
            width: '80px',
            '& .trai-wrapper': {
              '& .tbl-row-action-item:not(.kebab)': {
                display: 'flex !important',
                opacity: 0,
                pointerEvents: 'none',
              },
            },
          },
          '& table tr:hover .tbl-row-action-items-cont .trai-wrapper .tbl-row-action-item:not(.kebab)': {
            opacity: 1,
            pointerEvents: 'auto',
          },
        },
      }}>
        {logs.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Banner
              type={BannerTypes.INFO}
              size={BannerSizes.SMALL}
              message="No execution logs available"
            />
          </Box>
        ) : (
          <Table
            columns={columns}
            data={tableData}
            actionItems={actionItems}
            maxActions={1}
            onAction={handleAction}
            selectable={false}
            showPagination={false}
          />
        )}
      </Box>

      {/* Details Modal */}
      <Modal
        open={detailsModalOpen}
        type={ModalTypes.WITH_HEIGHT_TRANSITIONS}
        id={modalId}
        header={selectedLog ? (selectedLog.node_name || selectedLog.node_id) : 'Node Details'}
        showClose={true}
        onClose={handleCloseDetails}
        className="execution-details-modal"
      >
        {selectedLog && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Badge
                type={getNodeTypeBadgeType(selectedLog.node_type)}
                size={BadgeSizes.SMALL}
                label={selectedLog.node_type.replace('_', ' ').toUpperCase()}
              />
              <Badge
                type={getStatusBadgeType(selectedLog.status)}
                size={BadgeSizes.SMALL}
                label={selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1)}
              />
            </div>
            {selectedLog.message && (
              <div style={{ fontSize: '14px', color: '#667085', marginBottom: '16px' }}>
                {selectedLog.message}
              </div>
            )}
            {renderNodeDetails(selectedLog)}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
              <Button
                label="Close"
                type={ButtonTypes.PRIMARY}
                size={ButtonSizes.MEDIUM}
                onClick={handleCloseDetails}
              />
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .execution-details-modal .modal-content-wrapper {
          max-height: 80vh;
          overflow-y: auto;
        }
      `}</style>
    </Container>
  );
};

export default ExecutionDetails;
