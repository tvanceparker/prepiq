import React, { useEffect, useRef, useState } from 'react';
import {
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
  Tooltip,
  Grid,
  Box,
  Divider,
  Popper,
  Grow,
  TextField,
  Button as MUIButton,
  Stack,
  useTheme,
} from '@mui/material';
import useMediaQuery from '../hooks/useMediaQuery';
import Button from '../../../components/Button';
import type { NormalizedAlert } from '../hooks/useAlertsFeed';

interface Props {
  alerts: NormalizedAlert[];
  loading?: boolean;
  isCardView?: boolean;
  onFixSubmit?: (a: NormalizedAlert, v: string) => void;
  onResolve?: (id: string | number) => void;
  onAcknowledge?: (id: string | number) => void;
  isFixable?: (a: NormalizedAlert) => boolean;
  severityColors?: Record<string, string>;
}

export default function AlertsFeedTableBasic({
  alerts = [],
  loading = false,
  isCardView = false,
  onFixSubmit,
  onResolve,
  onAcknowledge,
  isFixable = () => false,
  severityColors = {},
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [openTooltipId, setOpenTooltipId] = useState<string | number | null>(null);
  const [fixAnchorEl, setFixAnchorEl] = useState<HTMLElement | null>(null);
  const [fixAlert, setFixAlert] = useState<NormalizedAlert | null>(null);
  const [fixValue, setFixValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (fixAnchorEl) requestAnimationFrame(() => inputRef.current?.focus());
  }, [fixAnchorEl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenTooltipId(null);
        closeFixPopper();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFixClick = (event: React.MouseEvent, alert: NormalizedAlert) => {
    event.stopPropagation();
    if (fixAlert?.alert_id === alert.alert_id) {
      closeFixPopper();
    } else {
      setFixAnchorEl(event.currentTarget as HTMLElement);
      setFixAlert(alert);
      setFixValue('');
    }
  };

  const handleFixSubmit = () => {
    if (onFixSubmit && fixAlert) {
      onFixSubmit(fixAlert, fixValue);
      closeFixPopper();
    }
  };

  const closeFixPopper = () => {
    setFixAnchorEl(null);
    setFixAlert(null);
    setFixValue('');
  };

  const renderFixPopper = () => {
    if (!fixAnchorEl || !fixAlert) return null;

    return (
      <Popper
        open={Boolean(fixAnchorEl)}
        anchorEl={fixAnchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
        transition
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} timeout={300}>
            <Paper sx={{ p: 2, width: 280, boxShadow: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                Fix Alert: {fixAlert.alert_type}
              </Typography>
              <Typography variant="body2" mb={2}>
                {fixAlert.message}
              </Typography>

              {(fixAlert.alert_type === 'DataQuality:NullOrZeroQuantity' ||
                fixAlert.alert_type === 'DataQuality:QuantityOutlier') && (
                <TextField
                  label="Quantity Sold"
                  type="number"
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  value={fixValue}
                  onChange={e => setFixValue(e.target.value)}
                  disabled={loading}
                  inputProps={{ min: 0 }}
                />
              )}

              <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                <MUIButton variant="outlined" onClick={closeFixPopper} disabled={loading}>
                  Cancel
                </MUIButton>
                <MUIButton
                  variant="contained"
                  onClick={handleFixSubmit}
                  disabled={loading || fixValue === ''}
                >
                  Confirm
                </MUIButton>
              </Stack>
            </Paper>
          </Grow>
        )}
      </Popper>
    );
  };

  if (isCardView) {
    return (
      <>
        <Grid container spacing={2} ref={containerRef}>
          {alerts.map(alert => {
            const displayStatus = alert.is_acknowledged ? 'Acknowledged' : alert.status;

            const meta = alert.meta
              ? Object.entries(alert.meta).map(([key, val]) => (
                  <Typography
                    key={key}
                    variant="body2"
                    color="textSecondary"
                    sx={{ textTransform: 'capitalize', mb: 0.5 }}
                  >
                    <strong>{key.replace(/_/g, ' ')}:</strong> {String(val)}
                  </Typography>
                ))
              : null;

            return (
              <Grid item xs={12} sm={6} md={4} key={alert.alert_id}>
                <Tooltip
                  title={<Box>{meta}</Box>}
                  open={openTooltipId === alert.alert_id}
                  onClose={() => setOpenTooltipId(null)}
                  placement="bottom"
                  arrow
                >
                  <Card
                    onClick={() =>
                      setOpenTooltipId(id => (id === alert.alert_id ? null : alert.alert_id))
                    }
                    sx={{
                      border: `2px solid ${severityColors[alert.severity] || theme.palette.grey[400]}`,
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      ':hover': { boxShadow: 6 },
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {`${alert.alert_type} - ${String(alert.severity).toUpperCase()}`}
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
                    </CardContent>

                    <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
                      <Button
                        size={isMobile ? 'sm' : 'md'}
                        variant="confirm"
                        disabled={alert.is_acknowledged || alert.status === 'resolved'}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onAcknowledge && onAcknowledge(alert.alert_id);
                        }}
                        requiredPermission="alerts"
                      >
                        Acknowledge
                      </Button>

                      <Button
                        size={isMobile ? 'sm' : 'md'}
                        variant="delete"
                        disabled={alert.status === 'resolved'}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onResolve && onResolve(alert.alert_id);
                        }}
                        requiredPermission="alerts"
                      >
                        Resolve
                      </Button>

                      {isFixable && isFixable(alert) && (
                        <Button
                          size={isMobile ? 'sm' : 'md'}
                          variant="default"
                          disabled={alert.status === 'resolved'}
                          onClick={(e: React.MouseEvent) => handleFixClick(e, alert)}
                          requiredPermission="alerts"
                        >
                          Fix
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>
        {renderFixPopper()}
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

              const meta = alert.meta
                ? Object.entries(alert.meta).map(([key, val]) => (
                    <Typography
                      key={key}
                      variant="body2"
                      color="textSecondary"
                      sx={{ textTransform: 'capitalize', mb: 0.5 }}
                    >
                      <strong>{key.replace(/_/g, ' ')}:</strong> {String(val)}
                    </Typography>
                  ))
                : null;

              return (
                <TableRow key={alert.alert_id} hover>
                  <TableCell>{alert.alert_id}</TableCell>
                  <TableCell>{alert.alert_type}</TableCell>
                  <TableCell>
                    <Tooltip title={<Box>{meta}</Box>} arrow>
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: 'underline dotted',
                          cursor: 'pointer',
                          display: 'inline-block',
                        }}
                      >
                        {alert.message}
                      </Typography>
                    </Tooltip>
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
                      sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}
                    >
                      <Tooltip title="Acknowledge Alert" arrow placement="top">
                        <Button
                          variant="confirm"
                          disabled={alert.is_acknowledged || alert.status === 'resolved'}
                          onClick={() => onAcknowledge && onAcknowledge(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          Acknowledge
                        </Button>
                      </Tooltip>

                      <Tooltip title="Delete Alert" arrow placement="left">
                        <Button
                          variant="delete"
                          disabled={alert.status === 'resolved'}
                          onClick={() => onResolve && onResolve(alert.alert_id)}
                          size="sm"
                          requiredPermission="alerts"
                        >
                          Resolve
                        </Button>
                      </Tooltip>

                      {isFixable && isFixable(alert) && (
                        <Tooltip title="Fix Alert" arrow>
                          <Button
                            variant="default"
                            onClick={(e: React.MouseEvent) => handleFixClick(e as any, alert)}
                            size="sm"
                            requiredPermission="alerts"
                          >
                            Fix
                          </Button>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {renderFixPopper()}
    </>
  );
}
