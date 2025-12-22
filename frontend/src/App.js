import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Settings as ConnectorsIcon,
  VpnKey as CredentialsIcon,
  PlayArrow as ActionsIcon,
  AccountTree as WorkflowsIcon,
  Storage as ApiLogsIcon,
  Event as EventsIcon,
  Timeline as SequencesIcon,
  History as ActivityLogsIcon,
  ShowChart as ExecutionLogsIcon,
} from '@mui/icons-material';
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

const drawerWidth = 240;

function App() {
  const [currentView, setCurrentView] = useState('workflows');
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [selectedCredentialForSets, setSelectedCredentialForSets] = useState(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [apiLogsOpen, setApiLogsOpen] = useState(false);

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
    { key: 'workflows', label: 'Workflows', icon: <WorkflowsIcon /> },
    { key: 'events', label: 'Events', icon: <EventsIcon /> },
    { key: 'sequences', label: 'Sequences', icon: <SequencesIcon /> },
    { key: 'connectors', label: 'Connectors', icon: <ConnectorsIcon /> },
    { key: 'credentials', label: 'Credentials', icon: <CredentialsIcon /> },
    { key: 'activity-logs', label: 'Activity Logs', icon: <ActivityLogsIcon /> },
    { key: 'execution-logs', label: 'Execution Logs', icon: <ExecutionLogsIcon /> },
    { key: 'api-logs', label: 'API Logs', icon: <ApiLogsIcon /> },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
          }}
        >
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Rule Engine Extensibility
              {selectedConnector && currentView === 'actions' && (
                <Typography variant="subtitle1" component="span" sx={{ ml: 2, opacity: 0.8 }}>
                  → {selectedConnector.name} Actions
                </Typography>
              )}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
          variant="permanent"
          anchor="left"
        >
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Navigation
            </Typography>
          </Toolbar>
          <Divider />
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.key} disablePadding>
                <ListItemButton
                  selected={currentView === item.key}
                  onClick={() => handleNavigationClick(item.key)}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            {selectedConnector && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem disablePadding>
                  <ListItemButton
                    selected={currentView === 'actions'}
                    onClick={() => setCurrentView('actions')}
                  >
                    <ListItemIcon>
                      <ActionsIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Actions" 
                      secondary={selectedConnector.name}
                    />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Drawer>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: 'background.default',
            p: 3,
            mt: 8, // Account for AppBar height
          }}
        >
          {renderCurrentView()}
        </Box>
        
        {/* API Call Log Viewer */}
        <ApiCallLogViewer
          open={apiLogsOpen}
          onClose={() => setApiLogsOpen(false)}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
