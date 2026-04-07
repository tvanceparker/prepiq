import React, { useState } from 'react';
import {
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Box,
  Divider,
  TextField,
  Stack,
  useTheme,
} from '@mui/material';

import useMediaQuery from '../hooks/useMediaQuery';
import Button from '../../../components/Button';

export default function AlertsFeedTableBasic({
  alerts,
  loading,
  isCardView,
  onFixSubmit,
  onReviewInInventory,
  onResolve,
  onAcknowledge,
  isFixable,
  severityColors,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [fixAlertId, setFixAlertId] = useState(null);
  const [fixValue, setFixValue] = useState('');

  const getDefaultFixValue = alert => {
    if (alert?.alert_type === 'Inventory:DeductionFailed') {
      const required = Number(alert?.meta?.required_quantity ?? '');
      return Number.isFinite(required) ? String(required) : '';
    }

    if (alert?.alert_type === 'DataQuality:MissingChannel') {
      return String(alert?.meta?.sales_channel ?? '');
    }

    const quantity = Number(alert?.meta?.required_quantity ?? alert?.meta?.quantity_sold ?? '');
    return Number.isFinite(quantity) ? String(quantity) : '';
  };

  const toggleExpanded = alertId => {
    setExpandedAlertId(currentId => (currentId === alertId ? null : alertId));
  };

  const handleFixClick = alert => {
    if (fixAlertId === alert.alert_id) {
      setFixAlertId(null);
      setFixValue('');
      return;
    }

    setFixAlertId(alert.alert_id);
    setFixValue(getDefaultFixValue(alert));
    setExpandedAlertId(alert.alert_id);
  };

  const closeFixEditor = () => {
    setFixAlertId(null);
    setFixValue('');
  };

  const renderMeta = alert => {
    if (!alert.meta || Object.keys(alert.meta).length === 0) {
      return null;
    }

    return (
      <Stack spacing={0.5} sx={{ mt: 1.5 }}>
        {Object.entries(alert.meta).map(([key, val]) => (
          <Typography
            key={key}
            variant="body2"
            color="text.secondary"
            sx={{ textTransform: 'capitalize' }}
          >
            <strong>{key.replace(/_/g, ' ')}:</strong> {val?.toString()}
          </Typography>
        ))}
      </Stack>
    );
  };

  const renderFixEditor = alert => {
    if (fixAlertId !== alert.alert_id) return null;

    const label =
      alert.alert_type === 'Inventory:DeductionFailed'
        ? 'Target Inventory Quantity'
        : alert.alert_type === 'DataQuality:MissingChannel'
          ? 'Sales Channel'
          : 'Quantity Sold';

    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 1.5 }}>
        <Typography variant="subtitle2" fontWeight="bold" mb={1}>
          Fix Alert
        </Typography>
        <TextField
          label={label}
          type={alert.alert_type === 'DataQuality:MissingChannel' ? 'text' : 'number'}
          fullWidth
          size="small"
          value={fixValue}
          onChange={e => setFixValue(e.target.value)}
          disabled={loading}
          inputProps={alert.alert_type === 'DataQuality:MissingChannel' ? undefined : { min: 0 }}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
          <Button variant="clearFilter" onClick={closeFixEditor} showIcon={false}>
            Cancel
          </Button>
          <Button
            variant="confirm"
            onClick={() => onFixSubmit?.(alert, fixValue)}
            disabled={loading || fixValue === ''}
            showIcon={false}
          >
            Confirm
          </Button>
        </Stack>
      </Paper>
    );
  };

  if (isCardView) {
    return (
      <>
        <Grid container spacing={2}>
          {alerts.map(alert => {
            const displayStatus = alert.is_acknowledged ? 'Acknowledged' : alert.status;

            return (
              <Grid item xs={12} sm={6} md={4} key={alert.alert_id}>
                <Card
                  sx={{
                    border: `2px solid ${
                      severityColors[alert.severity] || theme.palette.grey[400]
                    }`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    ':hover': { boxShadow: 6 },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {`${alert.alert_type} - ${alert.severity.toUpperCase()}`}
                    </Typography>
                    <Typography variant="body1" color="text.primary" gutterBottom sx={{ mb: 1 }}>
                      {alert.message}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="body2" color="text.secondary">
                      Employee ID: {alert.employee_id ?? '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Role: {alert.role ?? '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {displayStatus}
                    </Typography>

                    <Collapse in={expandedAlertId === alert.alert_id}>
                      {renderMeta(alert)}
                      {renderFixEditor(alert)}
                    </Collapse>
                  </CardContent>

                  <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="confirm"
                      disabled={alert.is_acknowledged || alert.status === 'resolved'}
                      onClick={() => onAcknowledge(alert.alert_id)}
                      requiredPermission="alerts"
                    >
                      Acknowledge
                    </Button>

                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="delete"
                      disabled={alert.status === 'resolved'}
                      onClick={() => onResolve(alert.alert_id)}
                      requiredPermission="alerts"
                    >
                      Resolve
                    </Button>

                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="default"
                      onClick={() => toggleExpanded(alert.alert_id)}
                      requiredPermission="alerts"
                    >
                      {expandedAlertId === alert.alert_id ? 'Hide Details' : 'Details'}
                    </Button>

                    {isFixable(alert) && (
                      <Button
                        size={isMobile ? 'sm' : 'md'}
                        variant="default"
                        disabled={alert.status === 'resolved'}
                        onClick={() => handleFixClick(alert)}
                        requiredPermission="alerts"
                      >
                        {fixAlertId === alert.alert_id ? 'Close Fix' : 'Fix'}
                      </Button>
                    )}

                    {alert.alert_type === 'Inventory:DeductionFailed' && onReviewInInventory && (
                      <Button
                        size={isMobile ? 'sm' : 'md'}
                        variant="default"
                        onClick={() => onReviewInInventory(alert)}
                        requiredPermission="alerts"
                      >
                        Review
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </>
    );
  }

  // Table view fallback
  return (
    <>
      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Employee ID</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map(alert => {
              const displayStatus = alert.is_acknowledged ? 'Acknowledged' : alert.status;

              return (
                <React.Fragment key={alert.alert_id}>
                  <TableRow hover>
                    <TableCell>{alert.alert_id}</TableCell>
                    <TableCell>{alert.alert_type}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{alert.message}</Typography>
                    </TableCell>
                    <TableCell>{alert.employee_id ?? '—'}</TableCell>
                    <TableCell>{alert.role ?? '—'}</TableCell>
                    <TableCell
                      sx={{
                        color: severityColors[alert.severity] || theme.palette.grey[600],
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                      }}
                    >
                      {alert.severity}
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{displayStatus}</TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                        }}
                      >
                        <Button
                          variant="confirm"
                          disabled={alert.is_acknowledged || alert.status === 'resolved'}
                          onClick={() => onAcknowledge(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          Ack
                        </Button>
                        <Button
                          variant="delete"
                          disabled={alert.status === 'resolved'}
                          onClick={() => onResolve(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => toggleExpanded(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          {expandedAlertId === alert.alert_id ? 'Hide' : 'Details'}
                        </Button>
                        {isFixable(alert) && (
                          <Button
                            variant="default"
                            disabled={alert.status === 'resolved'}
                            onClick={() => handleFixClick(alert)}
                            size="sm"
                            requiredPermission="alerts"
                          >
                            {fixAlertId === alert.alert_id ? 'Close Fix' : 'Fix'}
                          </Button>
                        )}
                        {alert.alert_type === 'Inventory:DeductionFailed' &&
                          onReviewInInventory && (
                            <Button
                              variant="default"
                              onClick={() => onReviewInInventory(alert)}
                              size="sm"
                              requiredPermission="alerts"
                            >
                              Review
                            </Button>
                          )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{
                        py: 0,
                        borderBottom: expandedAlertId === alert.alert_id ? undefined : 0,
                      }}
                    >
                      <Collapse
                        in={expandedAlertId === alert.alert_id}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box sx={{ py: 2 }}>
                          {renderMeta(alert)}
                          {renderFixEditor(alert)}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
