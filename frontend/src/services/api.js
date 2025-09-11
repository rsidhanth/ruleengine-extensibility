import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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
};

export const connectorsApi = {
  getAll: () => api.get('/connectors/'),
  get: (id) => api.get(`/connectors/${id}/`),
  create: (data) => api.post('/connectors/', data),
  update: (id, data) => api.put(`/connectors/${id}/`, data),
  delete: (id) => api.delete(`/connectors/${id}/`),
  test: (id, data = {}) => api.post(`/connectors/${id}/test/`, data),
  executeAction: (id, data) => api.post(`/connectors/${id}/execute_action/`, data),
};

export const actionsApi = {
  getAll: (connectorId = null) => api.get('/actions/', { params: connectorId ? { connector_id: connectorId } : {} }),
  get: (id) => api.get(`/actions/${id}/`),
  create: (data) => api.post('/actions/', data),
  update: (id, data) => api.put(`/actions/${id}/`, data),
  delete: (id) => api.delete(`/actions/${id}/`),
  test: (id, data = {}) => api.post(`/actions/${id}/test/`, data),
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

export default api;