import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Divider,
  Chip,
  Card,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const operators = [
  // String operators
  { value: 'equals', label: 'Equals (=)', types: ['string', 'number'] },
  { value: 'not_equals', label: 'Not Equals (≠)', types: ['string', 'number'] },
  { value: 'starts_with', label: 'Starts With', types: ['string'] },
  { value: 'ends_with', label: 'Ends With', types: ['string'] },
  { value: 'matches_regex', label: 'Matches Regex', types: ['string'] },

  // Number operators
  { value: 'greater_than', label: 'Greater Than (>)', types: ['number'] },
  { value: 'less_than', label: 'Less Than (<)', types: ['number'] },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal (≥)', types: ['number'] },
  { value: 'less_than_or_equal', label: 'Less Than or Equal (≤)', types: ['number'] },

  // Array operators
  { value: 'contains', label: 'Contains', types: ['array', 'string'] },
  { value: 'not_contains', label: 'Does Not Contain', types: ['array', 'string'] },
  { value: 'length_equals', label: 'Length Equals', types: ['array'] },
  { value: 'length_gt', label: 'Length Greater Than', types: ['array'] },
  { value: 'length_lt', label: 'Length Less Than', types: ['array'] },

  // List operators (for backward compatibility)
  { value: 'in', label: 'In List', types: ['string', 'number'] },
  { value: 'not_in', label: 'Not In List', types: ['string', 'number'] },

  // Common operators (work with all types)
  { value: 'is_empty', label: 'Is Empty', types: ['array', 'string'] },
  { value: 'is_not_empty', label: 'Is Not Empty', types: ['array', 'string'] },
  { value: 'is_null', label: 'Is Null', types: ['all'] },
  { value: 'is_not_null', label: 'Is Not Null', types: ['all'] },
];

const ConditionConfigDrawer = ({ open, onClose, nodeData, onSave, triggerEvents = [], sequenceVariables = [] }) => {
  const [conditionSets, setConditionSets] = useState([]);
  const [currentSet, setCurrentSet] = useState(null);
  const [eventVariables, setEventVariables] = useState([]);
  const [allVariables, setAllVariables] = useState([]);


  useEffect(() => {
    if (nodeData && nodeData.conditionSets) {
      setConditionSets(nodeData.conditionSets);
    }
  }, [nodeData]);

  // Reset currentSet when drawer closes
  useEffect(() => {
    if (!open) {
      setCurrentSet(null);
    }
  }, [open]);

  // Auto-open or create first condition set when drawer opens
  useEffect(() => {
    if (open && !currentSet && conditionSets.length === 0) {
      // Only create first set automatically if there are no sets yet
      const newSet = {
        id: `set_${Date.now()}`,
        label: `Condition Set 1`,
        conditions: [],
      };
      setCurrentSet(newSet);
    }
  }, [open, currentSet, conditionSets]);

  // Parse event_format from trigger events to extract variables
  useEffect(() => {
    if (triggerEvents && triggerEvents.length > 0) {
      const variables = [];

      triggerEvents.forEach(event => {
        // Handle different possible structures
        let properties = null;

        if (event.event_format) {
          // Try to get properties from different possible locations
          if (event.event_format.properties && typeof event.event_format.properties === 'object') {
            // Check if it's an object (not an array)
            if (!Array.isArray(event.event_format.properties)) {
              properties = event.event_format.properties;
            }
          }
        }

        if (properties) {
          Object.entries(properties).forEach(([key, propDef]) => {
            // Check if variable already exists (in case multiple events have same field)
            if (!variables.find(v => v.path === key)) {
              variables.push({
                path: propDef.path || key,
                label: propDef.label || key,
                type: propDef.type || 'string',
                description: propDef.description || '',
                eventName: event.name,
              });
            }
          });
        }
      });

      setEventVariables(variables);
    } else {
      // No trigger events
      setEventVariables([]);
    }
  }, [triggerEvents]);

  // Merge event variables and sequence variables
  useEffect(() => {
    const merged = [];

    // Add event variables with indicator
    eventVariables.forEach(variable => {
      merged.push({
        ...variable,
        source: 'event',
        displayLabel: `${variable.label} (Event)`,
      });
    });

    // Add sequence variables with indicator
    sequenceVariables.forEach(variable => {
      merged.push({
        path: `@workflow.${variable.name}`,
        label: variable.name,
        type: variable.type,
        source: 'workflow',
        displayLabel: `${variable.name} (Workflow)`,
      });
    });

    setAllVariables(merged);
  }, [eventVariables, sequenceVariables]);

  const handleAddConditionSet = () => {
    const newSet = {
      id: `set_${Date.now()}`,
      label: `Condition Set ${conditionSets.length + 1}`,
      conditions: [],
    };
    setCurrentSet(newSet);
  };

  const handleSaveConditionSet = () => {
    console.log('handleSaveConditionSet called', { currentSet, conditionsLength: currentSet?.conditions.length });

    if (!currentSet || currentSet.conditions.length === 0) {
      console.log('No conditions to save');
      return;
    }

    // Auto-generate label based on first condition
    const firstCond = currentSet.conditions[0];
    const variableLabel = allVariables.find(v => v.path === firstCond.variable)?.label || firstCond.variable || 'Unknown';
    const operatorLabel = operators.find(o => o.value === firstCond.operator)?.label?.split(' ')[0] || firstCond.operator || 'Equals';
    const autoLabel = `${variableLabel} ${operatorLabel} ...`;

    const setToSave = {
      ...currentSet,
      label: autoLabel
    };

    console.log('Saving condition set:', setToSave);

    const existingIndex = conditionSets.findIndex(s => s.id === currentSet.id);
    if (existingIndex >= 0) {
      const updated = [...conditionSets];
      updated[existingIndex] = setToSave;
      setConditionSets(updated);
      console.log('Updated existing set at index', existingIndex);
    } else {
      setConditionSets([...conditionSets, setToSave]);
      console.log('Added new set, total sets:', conditionSets.length + 1);
    }

    setCurrentSet(null);
    console.log('Set currentSet to null, should return to list view');
  };

  const handleEditConditionSet = (set) => {
    setCurrentSet({ ...set });
  };

  const handleDeleteConditionSet = (setId) => {
    setConditionSets(conditionSets.filter(s => s.id !== setId));
  };

  const handleAddCondition = () => {
    if (!currentSet) return;

    const newCondition = {
      id: `cond_${Date.now()}`,
      variable: '',
      operator: 'equals',
      valueType: 'static',
      staticValue: '',
      dynamicVariable: '',
      logicGate: currentSet.conditions.length > 0 ? 'AND' : null,
    };

    setCurrentSet({
      ...currentSet,
      conditions: [...currentSet.conditions, newCondition],
    });
  };

  const handleUpdateCondition = (conditionId, field, value) => {
    if (!currentSet) return;

    setCurrentSet({
      ...currentSet,
      conditions: currentSet.conditions.map(c =>
        c.id === conditionId ? { ...c, [field]: value } : c
      ),
    });
  };

  const handleDeleteCondition = (conditionId) => {
    if (!currentSet) return;

    setCurrentSet({
      ...currentSet,
      conditions: currentSet.conditions.filter(c => c.id !== conditionId),
    });
  };

  const handleSave = () => {
    // Ensure we preserve all node data including nodeType
    const updatedData = {
      ...nodeData,
      nodeType: nodeData?.nodeType || 'condition', // Ensure nodeType is always set
      conditionSets: conditionSets,
    };

    console.log('ConditionConfigDrawer saving data:', updatedData);
    onSave(updatedData);
    onClose();
  };

  const isValueRequired = (operator) => {
    return !['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(operator);
  };

  const getFilteredOperators = (variableType) => {
    if (!variableType) return operators;
    return operators.filter(op =>
      op.types.includes('all') || op.types.includes(variableType)
    );
  };

  const getValueInputType = (operator) => {
    // Return 'number' for operators that expect numeric values
    if (['length_equals', 'length_gt', 'length_lt', 'greater_than', 'less_than',
         'greater_than_or_equal', 'less_than_or_equal'].includes(operator)) {
      return 'number';
    }
    return 'text';
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 500 },
      }}
      sx={{
        zIndex: 10000,
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Configure Conditions
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {!currentSet ? (
            /* List of Condition Sets */
            <>
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddConditionSet}
                  fullWidth
                >
                  Add Condition Set
                </Button>
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Condition Sets ({conditionSets.length})
              </Typography>

              {conditionSets.length === 0 ? (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    borderRadius: 1,
                    border: '1px dashed #d1d5db',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No condition sets configured. Each set represents a separate flow path.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {conditionSets.map((set, index) => (
                    <Card key={set.id} variant="outlined">
                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {set.label}
                          </Typography>
                          <Box>
                            <IconButton size="small" onClick={() => handleEditConditionSet(set)}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteConditionSet(set.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {set.conditions.length} condition(s)
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {set.conditions.map((cond, idx) => (
                            <React.Fragment key={cond.id}>
                              {idx > 0 && (
                                <Chip
                                  label={cond.logicGate}
                                  size="small"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                              )}
                              <Chip
                                label={`${eventVariables.find(v => v.path === cond.variable)?.label || cond.variable} ${operators.find(o => o.value === cond.operator)?.label.split(' ')[0]}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            </React.Fragment>
                          ))}
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          ) : (
            /* Edit Condition Set */
            <>
              {eventVariables.length === 0 && (
                <Box
                  sx={{
                    p: 2,
                    mb: 2,
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#92400e', mb: 0.5 }}>
                    No Event Fields Available
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#78350f' }}>
                    The trigger event "{triggerEvents[0]?.name || 'selected'}" doesn't have any fields defined.
                    Please edit the event and add field definitions in the Event Payload Format section.
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Conditions
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddCondition}
                  variant="outlined"
                  disabled={eventVariables.length === 0}
                >
                  Add Condition
                </Button>
              </Box>

              {currentSet.conditions.map((condition, index) => (
                  <Card key={condition.id} sx={{ mb: 2, backgroundColor: '#f9fafb' }}>
                    <Box sx={{ p: 2 }}>
                      {index > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ mr: 1 }}>Logic Gate:</Typography>
                          <ToggleButtonGroup
                            value={condition.logicGate}
                            exclusive
                            onChange={(e, val) => val && handleUpdateCondition(condition.id, 'logicGate', val)}
                            size="small"
                          >
                            <ToggleButton value="AND">AND</ToggleButton>
                            <ToggleButton value="OR">OR</ToggleButton>
                          </ToggleButtonGroup>
                        </Box>
                      )}

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Variable</Typography>
                        <select
                          value={condition.variable || ''}
                          onChange={(e) => handleUpdateCondition(condition.id, 'variable', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">Select a variable</option>
                          {allVariables.map((variable) => (
                            <option key={variable.path} value={variable.path}>
                              {variable.displayLabel} - {variable.type}
                            </option>
                          ))}
                        </select>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5 }}>
                          {allVariables.length} variable(s) available ({eventVariables.length} event, {sequenceVariables.length} workflow)
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Operator</Typography>
                        <select
                          value={condition.operator || ''}
                          onChange={(e) => handleUpdateCondition(condition.id, 'operator', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {(() => {
                            const selectedVariable = eventVariables.find(v => v.path === condition.variable);
                            const availableOperators = selectedVariable
                              ? getFilteredOperators(selectedVariable.type)
                              : operators;
                            return availableOperators.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ));
                          })()}
                        </select>
                      </Box>

                    {isValueRequired(condition.operator) && (
                      <>
                        <Box sx={{ mt: 1, mb: 1 }}>
                          <ToggleButtonGroup
                            value={condition.valueType}
                            exclusive
                            onChange={(e, val) => val && handleUpdateCondition(condition.id, 'valueType', val)}
                            size="small"
                            fullWidth
                          >
                            <ToggleButton value="static">Static Value</ToggleButton>
                            <ToggleButton value="dynamic">Dynamic Variable</ToggleButton>
                          </ToggleButtonGroup>
                        </Box>

                        {condition.valueType === 'static' ? (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Value</Typography>
                            <input
                              type={getValueInputType(condition.operator)}
                              value={condition.staticValue || ''}
                              onChange={(e) => handleUpdateCondition(condition.id, 'staticValue', e.target.value)}
                              placeholder="Enter value"
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box'
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>Variable</Typography>
                            <select
                              value={condition.dynamicVariable || ''}
                              onChange={(e) => handleUpdateCondition(condition.id, 'dynamicVariable', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">Select a variable</option>
                              {allVariables.map((variable) => (
                                <option key={variable.path} value={variable.path}>
                                  {variable.displayLabel} - {variable.type}
                                </option>
                              ))}
                            </select>
                            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.5 }}>
                              {allVariables.length} variable(s) available ({eventVariables.length} event, {sequenceVariables.length} workflow)
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCondition(condition.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              ))}

              {currentSet.conditions.length === 0 && (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    borderRadius: 1,
                    border: '1px dashed #d1d5db',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No conditions added yet. Click "Add Condition" to start.
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setCurrentSet(null)}
                  fullWidth
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveConditionSet}
                  fullWidth
                  disabled={currentSet.conditions.length === 0}
                >
                  Save Set
                </Button>
              </Box>
            </>
          )}
        </Box>

        {/* Footer */}
        {!currentSet && (
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 2,
            }}
          >
            <Button variant="outlined" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} fullWidth>
              Save All
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default ConditionConfigDrawer;
