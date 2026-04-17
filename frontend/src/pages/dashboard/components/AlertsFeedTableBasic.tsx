import React, { useState } from 'react';
import { alpha } from '@mui/material/styles';
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

const getFixButtonLabel = alert => {
  switch (alert?.alert_type) {
    case 'DataQuality:MissingChannel':
      return 'Set Channel';
    case 'DataQuality:NullOrZeroQuantity':
    case 'DataQuality:QuantityOutlier':
      return 'Correct Quantity';
    case 'Inventory:DeductionFailed':
      return 'Adjust Quantity';
    default:
      return 'Fix Now';
  }
};

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

  const getSeverityColor = severity => severityColors[severity] || theme.palette.grey[500];

  const getAlertSurface = alert =>
    alpha(getSeverityColor(alert.severity), theme.palette.mode === 'dark' ? 0.14 : 0.07);

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
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mt: 1.5,
          borderRadius: 2.5,
          bgcolor:
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.94)
              : alpha(theme.palette.background.default, 0.72),
        }}
      >
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
                    border: '1px solid',
                    borderColor: alpha(getSeverityColor(alert.severity), 0.42),
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.94)
                        : alpha(theme.palette.background.paper, 0.98),
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 3,
                    ':hover': {
                      boxShadow: theme.palette.mode === 'dark' ? 'none' : 6,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <CardContent sx={{ backgroundColor: getAlertSurface(alert) }}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                        {alert.title || alert.alert_type}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.35,
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: getSeverityColor(alert.severity),
                          bgcolor: alpha(getSeverityColor(alert.severity), 0.14),
                        }}
                      >
                        {alert.severity.toUpperCase()}
                      </Box>
                      <Box
                        sx={{
                          px: 1,
                          py: 0.35,
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'text.secondary',
                          bgcolor: alpha(theme.palette.text.primary, 0.08),
                        }}
                      >
                        {alert.alert_type}
                      </Box>
                    </Stack>
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

                  <CardActions
                    sx={{
                      flexWrap: 'wrap',
                      gap: 1,
                      px: 2,
                      pb: 2,
                      pt: 1.5,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.background.default, 0.36)
                          : alpha(theme.palette.background.default, 0.72),
                    }}
                  >
                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="confirm"
                      disabled={alert.is_acknowledged || alert.status === 'resolved'}
                      onClick={() => onAcknowledge(alert.alert_id)}
                      requiredPermission="alerts"
                    >
                      Mark Seen
                    </Button>

                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="delete"
                      disabled={alert.status === 'resolved'}
                      onClick={() => onResolve(alert.alert_id)}
                      requiredPermission="alerts"
                    >
                      Close Alert
                    </Button>

                    <Button
                      size={isMobile ? 'sm' : 'md'}
                      variant="default"
                      onClick={() => toggleExpanded(alert.alert_id)}
                      requiredPermission="alerts"
                    >
                      {expandedAlertId === alert.alert_id ? 'Hide Context' : 'More Context'}
                    </Button>

                    {isFixable(alert) && (
                      <Button
                        size={isMobile ? 'sm' : 'md'}
                        variant="default"
                        disabled={alert.status === 'resolved'}
                        onClick={() => handleFixClick(alert)}
                        requiredPermission="alerts"
                      >
                        {fixAlertId === alert.alert_id ? 'Close Fix' : getFixButtonLabel(alert)}
                      </Button>
                    )}

                    {alert.alert_type === 'Inventory:DeductionFailed' && onReviewInInventory && (
                      <Button
                        size={isMobile ? 'sm' : 'md'}
                        variant="default"
                        onClick={() => onReviewInInventory(alert)}
                        requiredPermission="alerts"
                      >
                        {alert.action_label || 'Review Inventory'}
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
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 500,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor:
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.94)
              : alpha(theme.palette.background.paper, 0.98),
        }}
      >
        <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                ID
              </TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                Type
              </TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                Message
              </TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                Employee ID
              </TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                Role
              </TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                Severity
              </TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}>
                Status
              </TableCell>
              <TableCell
                align="center"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), fontWeight: 700 }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map(alert => {
              const displayStatus = alert.is_acknowledged ? 'Acknowledged' : alert.status;

              return (
                <React.Fragment key={alert.alert_id}>
                  <TableRow hover sx={{ bgcolor: getAlertSurface(alert) }}>
                    <TableCell>{alert.alert_id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {alert.title || alert.alert_type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {alert.alert_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{alert.message}</Typography>
                    </TableCell>
                    <TableCell>{alert.employee_id ?? '—'}</TableCell>
                    <TableCell>{alert.role ?? '—'}</TableCell>
                    <TableCell
                      sx={{
                        color: getSeverityColor(alert.severity),
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
                          Seen
                        </Button>
                        <Button
                          variant="delete"
                          disabled={alert.status === 'resolved'}
                          onClick={() => onResolve(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          Close
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => toggleExpanded(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          {expandedAlertId === alert.alert_id ? 'Hide' : 'Context'}
                        </Button>
                        {isFixable(alert) && (
                          <Button
                            variant="default"
                            disabled={alert.status === 'resolved'}
                            onClick={() => handleFixClick(alert)}
                            size="sm"
                            requiredPermission="alerts"
                          >
                            {fixAlertId === alert.alert_id ? 'Close Fix' : getFixButtonLabel(alert)}
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
                              {alert.action_label || 'Review Inventory'}
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
                        <Box
                          sx={{
                            py: 2,
                            px: 1,
                            bgcolor:
                              theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.default, 0.24)
                                : alpha(theme.palette.background.default, 0.58),
                          }}
                        >
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
