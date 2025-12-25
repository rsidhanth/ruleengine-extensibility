import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

const DependencyErrorDialog = ({ open, onClose, missingDependencies }) => {
  if (!missingDependencies) return null;

  const hasEvents = missingDependencies.events && missingDependencies.events.length > 0;
  const hasConnectors = missingDependencies.connectors && missingDependencies.connectors.length > 0;
  const hasActions = missingDependencies.actions && missingDependencies.actions.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ErrorIcon color="error" />
        Cannot Import Sequence
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          This sequence cannot be imported because it depends on events, connectors, or actions that
          don't exist in this environment. Please import the required dependencies first.
        </Alert>

        {hasEvents && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem', fontWeight: 600 }}>
              Missing Events ({missingDependencies.events.length})
            </Typography>
            <List dense sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              {missingDependencies.events.map((event, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={event.name || `Event ID: ${event.id}`}
                      secondary={
                        event.node
                          ? `Referenced in node: ${event.node}`
                          : event.context
                          ? `Referenced in: ${event.context}`
                          : null
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {hasConnectors && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem', fontWeight: 600 }}>
              Missing Connectors ({missingDependencies.connectors.length})
            </Typography>
            <List dense sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              {missingDependencies.connectors.map((connector, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText primary={connector} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        {hasActions && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem', fontWeight: 600 }}>
              Missing Actions ({missingDependencies.actions.length})
            </Typography>
            <List dense sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              {missingDependencies.actions.map((action, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={action.name || `Action ID: ${action.id}`}
                      secondary={
                        <>
                          {action.connector && `Connector: ${action.connector}`}
                          {action.node && ` | Referenced in node: ${action.node}`}
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          To import this sequence, you must first import or create the missing dependencies in this
          environment.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DependencyErrorDialog;
