import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper to get the backend origin (for OAuth redirect URI display)
export const getBackendOrigin = () => {
  try {
    const url = new URL(API_BASE_URL);
    return url.origin;
  } catch {
    // If API_BASE_URL is a relative path, use current origin
    return window.location.origin;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const credentialsApi = {
  getAll: () => api.get('/credentials/'),
  get: (id) => api.get(`/credentials/${id}/`),
  create: (data) => api.post('/credentials/', data),
  update: (id, data) => api.put(`/credentials/${id}/`, data),
  delete: (id) => api.delete(`/credentials/${id}/`),
  testOAuth2: (data) => api.post('/credentials/test_oauth2/', data),
  testCustomAuth: (data) => api.post('/credentials/test_custom_auth/', data),
  getRequiredFields: (id) => api.get(`/credentials/${id}/required_fields/`),
  // OAuth2 Authorization Code Flow
  oauth2Initiate: (id, data) => api.post(`/credentials/${id}/oauth2_initiate/`, data),
};

export const credentialSetsApi = {
  getAll: (params = {}) => api.get('/credential-sets/', { params }),
  get: (id) => api.get(`/credential-sets/${id}/`),
  create: (data) => api.post('/credential-sets/', data),
  update: (id, data) => api.put(`/credential-sets/${id}/`, data),
  delete: (id) => api.delete(`/credential-sets/${id}/`),
  // OAuth2 Token Management
  refreshToken: (id) => api.post(`/credential-sets/${id}/refresh_token/`),
  getTokenStatus: (id) => api.get(`/credential-sets/${id}/token_status/`),
};

export const connectorsApi = {
  getAll: () => api.get('/connectors/'),
  get: (id) => api.get(`/connectors/${id}/`),
  create: (data) => api.post('/connectors/', data),
  update: (id, data) => api.put(`/connectors/${id}/`, data),
  delete: (id) => api.delete(`/connectors/${id}/`),
  test: (id, data = {}) => api.post(`/connectors/${id}/test/`, data),
  executeAction: (id, data) => api.post(`/connectors/${id}/execute_action/`, data),
  toggleStatus: (id) => api.post(`/connectors/${id}/toggle_status/`),
  export: (id) => api.get(`/connectors/${id}/export/`),
  import: (data) => api.post('/connectors/import_connector/', data),
};

export const actionsApi = {
  list: (params = {}) => api.get('/actions/', { params }),
  getAll: (connectorId = null) => api.get('/actions/', { params: connectorId ? { connector: connectorId } : {} }),
  get: (id) => api.get(`/actions/${id}/`),
  create: (data) => api.post('/actions/', data),
  update: (id, data) => api.put(`/actions/${id}/`, data),
  delete: (id) => api.delete(`/actions/${id}/`),
  test: (id, data = {}) => api.post(`/actions/${id}/test/`, data),
  toggleStatus: (id) => api.post(`/actions/${id}/toggle_status/`),
  getCredentialSets: (id) => api.get(`/actions/${id}/credential_sets/`),
};

export const testsApi = {
  getAll: (connectorId = null) => api.get('/tests/', { params: connectorId ? { connector_id: connectorId } : {} }),
  get: (id) => api.get(`/tests/${id}/`),
};

export const customAuthConfigsApi = {
  getAll: (credentialId = null) => api.get('/custom-auth-configs/', { params: credentialId ? { credential_id: credentialId } : {} }),
  get: (id) => api.get(`/custom-auth-configs/${id}/`),
  create: (data) => api.post('/custom-auth-configs/', data),
  update: (id, data) => api.put(`/custom-auth-configs/${id}/`, data),
  delete: (id) => api.delete(`/custom-auth-configs/${id}/`),
  testApi: (id) => api.post(`/custom-auth-configs/${id}/test_api/`),
  clearCache: (id) => api.post(`/custom-auth-configs/${id}/clear_cache/`),
};

export const workflowsApi = {
  getAll: () => api.get('/workflows/'),
  get: (id) => api.get(`/workflows/${id}/`),
  create: (data) => api.post('/workflows/', data),
  update: (id, data) => api.put(`/workflows/${id}/`, data),
  delete: (id) => api.delete(`/workflows/${id}/`),
  createExecution: (id) => api.post(`/workflows/${id}/create_execution/`),
  createSampleWorkflows: () => api.post('/workflows/create_sample_workflows/'),
};

export const workflowExecutionsApi = {
  getAll: () => api.get('/workflow-executions/'),
  get: (id) => api.get(`/workflow-executions/${id}/`),
  updateStep1: (id, data) => api.post(`/workflow-executions/${id}/update_step1/`, data),
  proceedToStep2: (id, data) => api.post(`/workflow-executions/${id}/proceed_to_step2/`, data),
  updateStep2: (id, data) => api.post(`/workflow-executions/${id}/update_step2/`, data),
  completeWorkflow: (id, data) => api.post(`/workflow-executions/${id}/complete_workflow/`, data),
};

export const workflowRulesApi = {
  getAll: (workflowId = null) => api.get('/workflow-rules/', { params: workflowId ? { workflow_id: workflowId } : {} }),
  get: (id) => api.get(`/workflow-rules/${id}/`),
  create: (data) => api.post('/workflow-rules/', data),
  update: (id, data) => api.put(`/workflow-rules/${id}/`, data),
  delete: (id) => api.delete(`/workflow-rules/${id}/`),
  testRule: (id, data) => api.post(`/workflow-rules/${id}/test_rule/`, data),
};

export const ruleExecutionsApi = {
  getAll: (workflowExecutionId = null) => api.get('/rule-executions/', { params: workflowExecutionId ? { workflow_execution_id: workflowExecutionId } : {} }),
  get: (id) => api.get(`/rule-executions/${id}/`),
};

export const eventsApi = {
  getAll: () => api.get('/events/'),
  get: (id) => api.get(`/events/${id}/`),
  create: (data) => api.post('/events/', data),
  update: (id, data) => api.put(`/events/${id}/`, data),
  delete: (id) => api.delete(`/events/${id}/`),
  toggleStatus: (id) => api.post(`/events/${id}/toggle_status/`),
  getTestEndpoint: (id) => api.get(`/events/${id}/test_endpoint/`),
  getTestPayload: (id) => api.get(`/events/${id}/test_payload/`),
  getSamplePayload: (id) => api.get(`/events/${id}/sample_payload/`),
  export: (id) => api.get(`/events/${id}/export/`),
  import: (data) => api.post('/events/import_event/', data),
};

export const sequencesApi = {
  getAll: () => api.get('/sequences/'),
  get: (id) => api.get(`/sequences/${id}/`),
  create: (data) => api.post('/sequences/', data),
  update: (id, data) => api.put(`/sequences/${id}/`, data),
  delete: (id) => api.delete(`/sequences/${id}/`),
  toggleStatus: (id) => api.post(`/sequences/${id}/toggle_status/`),
  execute: (id, triggerData = {}) => api.post(`/sequences/${id}/execute/`, { trigger_data: triggerData }),
  getTestInfo: (id) => api.get(`/sequences/${id}/test_info/`),
  getTestStatus: (id) => api.get(`/sequences/${id}/test_status/`),
  export: (id) => api.get(`/sequences/${id}/export/`),
  validateImport: (data) => api.post('/sequences/validate_import/', data),
  import: (data) => api.post('/sequences/import_sequence/', data),
};

export const activityLogsApi = {
  getAll: (params = {}) => api.get('/activity-logs/', { params }),
  get: (id) => api.get(`/activity-logs/${id}/`),
};

export const sequenceExecutionsApi = {
  getAll: (params = {}) => api.get('/sequence-executions/', { params }),
  get: (id) => api.get(`/sequence-executions/${id}/`),
};

export const executionLogsApi = {
  getAll: (params = {}) => api.get('/execution-logs/', { params }),
  get: (id) => api.get(`/execution-logs/${id}/`),
};

export default api;