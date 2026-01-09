import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
} from '@mui/material';
import notification, { NotificationBase } from '@leegality/leegality-react-component-library/dist/notification';
import {
  Calendar,
  GitBranch,
  Settings,
  Key,
  Activity,
  BarChart2,
  PlayCircle,
} from 'react-feather';
import Icon from '@leegality/leegality-react-component-library/dist/icon';
import Connectors from './pages/Connectors';
import Credentials from './pages/Credentials';
import Actions from './pages/Actions';
import Workflows from './pages/Workflows';
import Events from './pages/Events';
import Sequences from './pages/Sequences';
import ActivityLogs from './pages/ActivityLogs';
import ExecutionLogs from './pages/ExecutionLogs';
import ExecutionDetails from './pages/ExecutionDetails';
import ApiCallLogViewer from './components/ApiCallLogViewer';
import api from './services/api';

const theme = createTheme({
  palette: {
    primary: {
      main: '#7c3aed',
    },
    secondary: {
      main: '#a855f7',
    },
  },
});

const sidebarWidth = 240;

function App() {
  const [currentView, setCurrentView] = useState('sequences');
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [selectedCredentialForSets, setSelectedCredentialForSets] = useState(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [apiLogsOpen, setApiLogsOpen] = useState(false);

  useEffect(() => {
    // Test API connection on mount
    const testConnection = async () => {
      try {
        await api.get('/workflows/');
      } catch (error) {
        console.error('API Connection Error:', error);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
        const errorMessage = error.response
          ? `Server returned ${error.response.status}`
          : 'Please check if the backend is running and REACT_APP_API_URL is set correctly.';
        notification.error('Backend Connection Error', `Cannot connect to backend at ${apiUrl}. ${errorMessage}`);
      }
    };
    testConnection();
  }, []);

  const handleNavigateToActions = (connector) => {
    setSelectedConnector(connector);
    setCurrentView('actions');
  };

  const handleBackToConnectors = () => {
    setSelectedConnector(null);
    setCurrentView('connectors');
  };

  const handleNavigateToCredentialSets = (credential) => {
    setSelectedCredentialForSets(credential);
    setCurrentView('credentials');
  };

  const handleClearSelectedCredential = () => {
    setSelectedCredentialForSets(null);
  };

  const handleNavigateToExecutionDetails = (executionId) => {
    setSelectedExecutionId(executionId);
    setCurrentView('execution-details');
  };

  const handleBackToExecutionLogs = () => {
    setSelectedExecutionId(null);
    setCurrentView('execution-logs');
  };

  const handleNavigationClick = (view) => {
    if (view === 'api-logs') {
      setApiLogsOpen(true);
    } else {
      setCurrentView(view);
      if (view !== 'actions') {
        setSelectedConnector(null);
      }
      if (view !== 'credentials') {
        setSelectedCredentialForSets(null);
      }
      if (view !== 'execution-details') {
        setSelectedExecutionId(null);
      }
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'credentials':
        return <Credentials selectedCredential={selectedCredentialForSets} onClearSelectedCredential={handleClearSelectedCredential} />;
      case 'connectors':
        return <Connectors onNavigateToActions={handleNavigateToActions} onNavigateToCredentialSets={handleNavigateToCredentialSets} />;
      case 'actions':
        return <Actions connector={selectedConnector} onBack={handleBackToConnectors} />;
      case 'events':
        return <Events />;
      case 'sequences':
        return <Sequences />;
      case 'activity-logs':
        return <ActivityLogs />;
      case 'execution-logs':
        return <ExecutionLogs onNavigateToDetails={handleNavigateToExecutionDetails} />;
      case 'execution-details':
        return <ExecutionDetails executionId={selectedExecutionId} onBack={handleBackToExecutionLogs} />;
      default:
        return <Workflows />;
    }
  };

  const navigationItems = [
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'sequences', label: 'Sequences', icon: GitBranch },
    { key: 'connectors', label: 'Connectors', icon: Settings },
    { key: 'credentials', label: 'Credentials', icon: Key },
    { key: 'activity-logs', label: 'Activity Logs', icon: Activity },
    { key: 'execution-logs', label: 'Execution Logs', icon: BarChart2 },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <Box
          component="aside"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            backgroundColor: '#fff',
            borderRight: '1px solid #e4e7ec',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Logo/Brand Header */}
          <Box
            sx={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              px: 2,
              borderBottom: '1px solid #e4e7ec',
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7f56d9 0%, #9e77ed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
              }}
            >
              <GitBranch size={18} color="#fff" />
            </Box>
            <Box sx={{ fontSize: '14px', fontWeight: 600, color: '#101828' }}>
              Rule Engine
            </Box>
          </Box>

          {/* Navigation */}
          <Box sx={{ flex: 1, py: 2 }}>
            <Box sx={{ px: 2, mb: 1 }}>
              <Box sx={{ fontSize: '12px', fontWeight: 500, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Navigation
              </Box>
            </Box>
            <Box component="nav">
              {navigationItems.map((item) => {
                const isSelected = currentView === item.key;
                const IconComponent = item.icon;
                return (
                  <Box
                    key={item.key}
                    onClick={() => handleNavigationClick(item.key)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 1.25,
                      mx: 1,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f9f5ff' : 'transparent',
                      color: isSelected ? '#7f56d9' : '#344054',
                      fontWeight: isSelected ? 500 : 400,
                      fontSize: '14px',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        backgroundColor: isSelected ? '#f9f5ff' : '#f9fafb',
                      },
                    }}
                  >
                    <Icon
                      icon={IconComponent}
                      size={20}
                      color={isSelected ? '#7f56d9' : '#667085'}
                    />
                    <Box sx={{ ml: 1.5 }}>{item.label}</Box>
                  </Box>
                );
              })}
              {selectedConnector && (
                <>
                  <Box sx={{ borderTop: '1px solid #e4e7ec', mx: 2, my: 1.5 }} />
                  <Box
                    onClick={() => setCurrentView('actions')}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 1.25,
                      mx: 1,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: currentView === 'actions' ? '#f9f5ff' : 'transparent',
                      color: currentView === 'actions' ? '#7f56d9' : '#344054',
                      fontWeight: currentView === 'actions' ? 500 : 400,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: currentView === 'actions' ? '#f9f5ff' : '#f9fafb',
                      },
                    }}
                  >
                    <Icon
                      icon={PlayCircle}
                      size={20}
                      color={currentView === 'actions' ? '#7f56d9' : '#667085'}
                    />
                    <Box sx={{ ml: 1.5 }}>
                      <Box>Actions</Box>
                      <Box sx={{ fontSize: '12px', color: '#667085', fontWeight: 400 }}>
                        {selectedConnector.name}
                      </Box>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
          {/* Top Header Bar */}
          <Box
            component="header"
            sx={{
              height: 64,
              backgroundColor: '#fff',
              borderBottom: '1px solid #e4e7ec',
              display: 'flex',
              alignItems: 'center',
              px: 3,
            }}
          >
            <Box sx={{ fontSize: '18px', fontWeight: 600, color: '#101828' }}>
              Rule Engine Extensibility
              {selectedConnector && currentView === 'actions' && (
                <Box component="span" sx={{ ml: 2, color: '#667085', fontWeight: 400, fontSize: '14px' }}>
                  → {selectedConnector.name} Actions
                </Box>
              )}
            </Box>
          </Box>

          {/* Page Content */}
          <Box
            component="main"
            sx={{
              flex: 1,
              px: 3,
              py: 2,
              overflow: 'auto',
            }}
          >
            {renderCurrentView()}
          </Box>
        </Box>

        {/* API Call Log Viewer */}
        <ApiCallLogViewer
          open={apiLogsOpen}
          onClose={() => setApiLogsOpen(false)}
        />

        {/* Notification Toast Container */}
        <NotificationBase />
      </Box>
    </ThemeProvider>
  );
}

export default App;
