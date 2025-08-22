import React, { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import useAlertsFeed from '../hooks/useAlertsFeed';
import useMediaQuery from '../hooks/useMediaQuery';
import AlertsFeedTableBasic from './AlertsFeedTableBasic';
import { PageHeader } from '../../../components/PageHeader';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const severityColors: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  urgent: 'red',
};

export default function AlertsFeedBasic(): JSX.Element {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [viewAll, setViewAll] = useState(false);
  const [useCardView, setUseCardView] = useState(false);
  const [fixingAlert, setFixingAlert] = useState<any | null>(null);
  const [fixInput, setFixInput] = useState('');
  const [fixLoading, setFixLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'info' });

  const {
    alerts,
    loading,
    error,
    loadMore,
    acknowledge,
    resolve,
    fix,
    isFixable,
    hasMore,
    setFeedMode,
    remove,
  } = useAlertsFeed();

  useEffect(() => {
    setFeedMode(viewAll ? 'all' : 'active');
  }, [viewAll, setFeedMode]);

  useEffect(() => {
    if (isMobile) setUseCardView(true);
  }, [isMobile]);

  const showSnackbar = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (_event?: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleAcknowledge = async (alertId: string | number) => {
    try {
      await acknowledge(alertId);
      showSnackbar('Alert acknowledged', 'success');
    } catch {
      showSnackbar('Failed to acknowledge alert', 'error');
    }
  };

  const handleResolve = async (alertId: string | number) => {
    if (!viewAll) remove(alertId);
    try {
      await resolve(alertId);
      showSnackbar('Alert resolved', 'success');
    } catch {
      showSnackbar('Failed to resolve alert', 'error');
    }
  };

  const openFixModal = (alert: any) => {
    setFixingAlert(alert);
    setFixInput('');
  };

  const closeFixModal = () => {
    setFixingAlert(null);
    setFixInput('');
    setFixLoading(false);
  };

  const handleFixSubmit = async () => {
    if (!fixInput.trim()) {
      showSnackbar('Please enter a valid value', 'error');
      return;
    }

    let fixData: any = {};
    switch (fixingAlert?.alert_type) {
      case 'DataQuality:NullOrZeroQuantity':
      case 'DataQuality:QuantityOutlier': {
        const quantity = Number(fixInput);
        if (isNaN(quantity) || quantity < 0) {
          showSnackbar('Please enter a valid non-negative number for quantity', 'error');
          return;
        }
        fixData = { quantity_sold: quantity };
        break;
      }
      case 'DataQuality:MissingChannel':
        fixData = { sales_channel: fixInput.trim() };
        break;
      default:
        showSnackbar('Unsupported alert type for fixing', 'error');
        return;
    }

    setFixLoading(true);
    try {
      await fix(fixingAlert.alert_id, fixData);
      showSnackbar('Alert fixed successfully', 'success');
      if (!viewAll) remove(fixingAlert.alert_id);
      closeFixModal();
    } catch {
      showSnackbar('Failed to fix alert', 'error');
      setFixLoading(false);
    }
  };

  return (
    <>
      <Paper sx={{ maxWidth: 1200, mt: 4, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 8 } }}>
        <PageHeader title="⚠️ Alerts & Issues" />

        {error && (
          <Typography
            variant="body1"
            color="error"
            fontWeight="semibold"
            mb={2}
            sx={{ userSelect: 'none' }}
          >
            {typeof error === 'string' ? error : ((error as any)?.message ?? String(error))}
          </Typography>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          spacing={2}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {viewAll ? 'Viewing all alerts (active and resolved)' : 'Showing only active alerts'}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button
              variant={viewAll ? 'clearFilter' : 'confirm'}
              onClick={() => setViewAll(v => !v)}
              showIcon={false}
            >
              {viewAll ? 'View Active Only' : 'View All'}
            </Button>
            {!isMobile && (
              <Button variant="default" onClick={() => setUseCardView(v => !v)}>
                {useCardView ? 'Table View' : 'Card View'}
              </Button>
            )}
          </Stack>
        </Stack>

        <AlertsFeedTableBasic
          alerts={alerts}
          loading={loading}
          isCardView={useCardView}
          isFixable={isFixable}
          onFixSubmit={(alert: any, value: string) => {
            openFixModal(alert);
            setFixInput(value);
          }}
          onResolve={handleResolve}
          onAcknowledge={handleAcknowledge}
          severityColors={severityColors}
        />

        {hasMore && (
          <Stack mt={4} justifyContent="center" alignItems="center">
            <Button onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </Stack>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
