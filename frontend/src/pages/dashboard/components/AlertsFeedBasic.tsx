import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import useAlertsFeed from '../hooks/useAlertsFeed';
import useMediaQuery from '../hooks/useMediaQuery';
import AlertsFeedTableBasic from './AlertsFeedTableBasic';
import { PageHeader } from '../../../components/PageHeader';
import { fetchLatestEodSummary } from '../../../api/eod';
import type { EodRunSummary } from '../../../interfaces/eod';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const severityColors: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  urgent: 'red',
};

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');

export default function AlertsFeedBasic(): JSX.Element {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();

  const [viewAll, setViewAll] = useState(false);
  const [useCardView, setUseCardView] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'info' });
  const [eodSummary, setEodSummary] = useState<EodRunSummary | null>(null);

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

  useEffect(() => {
    let active = true;

    fetchLatestEodSummary()
      .then(summary => {
        if (active) {
          setEodSummary(summary);
        }
      })
      .catch(() => {
        if (active) {
          setEodSummary(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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

  const handleFixSubmit = async (alert: any, rawValue: string) => {
    if (!rawValue.trim()) {
      showSnackbar('Please enter a valid value', 'error');
      return;
    }

    let fixData: any = {};
    switch (alert?.alert_type) {
      case 'DataQuality:NullOrZeroQuantity':
      case 'DataQuality:QuantityOutlier': {
        const quantity = Number(rawValue);
        if (isNaN(quantity) || quantity < 0) {
          showSnackbar('Please enter a valid non-negative number for quantity', 'error');
          return;
        }
        fixData = { quantity_sold: quantity };
        break;
      }
      case 'DataQuality:MissingChannel':
        fixData = { sales_channel: rawValue.trim() };
        break;
      case 'Inventory:DeductionFailed': {
        const targetQuantity = Number(rawValue);
        if (isNaN(targetQuantity) || targetQuantity < 0) {
          showSnackbar('Please enter a valid non-negative inventory quantity', 'error');
          return;
        }
        fixData = { target_quantity_on_hand: targetQuantity };
        break;
      }
      default:
        showSnackbar('Unsupported alert type for fixing', 'error');
        return;
    }

    try {
      await fix(alert.alert_id, fixData);
      showSnackbar('Alert fixed successfully', 'success');
      if (!viewAll) remove(alert.alert_id);
    } catch {
      showSnackbar('Failed to fix alert', 'error');
    }
  };

  const handleReviewInInventory = (target: {
    alertId?: number | null;
    ingredientId?: number | null;
    batchRecipeId?: number | null;
  }) => {
    navigate('/inventory/table', {
      state: {
        focusReview: {
          alertId: target.alertId ?? null,
          ingredientId: target.ingredientId ?? null,
          batchRecipeId: target.batchRecipeId ?? null,
        },
      },
    });
  };

  const handleAlertReviewInInventory = (alert: any) => {
    handleReviewInInventory({
      alertId: alert.alert_id,
      ingredientId: alert?.meta?.ingredient_id ?? null,
      batchRecipeId: alert?.meta?.batch_recipe_id ?? null,
    });
  };

  const runStatusColor =
    eodSummary?.status === 'success'
      ? 'success'
      : eodSummary?.status === 'partial'
        ? 'warning'
        : eodSummary?.status === 'failed'
          ? 'error'
          : 'info';

  return (
    <>
      <Paper sx={{ maxWidth: 1200, mt: 4, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 8 } }}>
        <PageHeader title="Alerts & Issues" />

        {eodSummary && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
            >
              <Stack spacing={0.5} sx={{ flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Latest EOD Run
                </Typography>
                <Typography variant="h6">{eodSummary.status_message}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Run date {eodSummary.run_date}
                  {eodSummary.finished_at
                    ? ` · Finished ${new Date(eodSummary.finished_at).toLocaleString()}`
                    : ''}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip color={runStatusColor} label={eodSummary.status.toUpperCase()} />
                <Chip
                  variant="outlined"
                  label={`Forecast ${eodSummary.forecast.forecast_status.toUpperCase()}`}
                />
                <Chip
                  variant="outlined"
                  label={`${eodSummary.counts.open_discrepancy_count} open review`}
                />
                <Chip
                  variant="outlined"
                  label={`${eodSummary.counts.purchase_order_suggestion_count} suggestions`}
                />
              </Stack>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {eodSummary.forecast.forecast_status_message}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              {eodSummary.stages.map(stage => (
                <Chip
                  key={stage.stage}
                  size="small"
                  color={stage.completed ? 'success' : 'default'}
                  variant={stage.completed ? 'filled' : 'outlined'}
                  label={
                    stage.duration_ms != null
                      ? `${formatStageLabel(stage.stage)} ${Math.round(stage.duration_ms / 1000)}s`
                      : formatStageLabel(stage.stage)
                  }
                />
              ))}
            </Stack>

            {eodSummary.errors.length > 0 && (
              <Stack spacing={0.75} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Needs review</Typography>
                {eodSummary.errors.slice(0, 3).map(errorItem => (
                  <Typography
                    key={`${errorItem.stage}-${errorItem.ts ?? errorItem.message}`}
                    variant="body2"
                    color="error.main"
                  >
                    {formatStageLabel(errorItem.stage)}: {errorItem.message}
                  </Typography>
                ))}
              </Stack>
            )}

            {eodSummary.repair_targets.length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Open inventory review</Typography>
                {eodSummary.repair_targets.slice(0, 3).map(target => (
                  <Stack
                    key={`${target.alert_id ?? 'no-alert'}-${target.ingredient_id ?? target.batch_recipe_id ?? target.item_name}`}
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ md: 'center' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {target.item_name || 'Inventory item'}: {target.message}
                    </Typography>
                    <Button
                      variant="default"
                      onClick={() =>
                        handleReviewInInventory({
                          alertId: target.alert_id,
                          ingredientId: target.ingredient_id,
                          batchRecipeId: target.batch_recipe_id,
                        })
                      }
                      showIcon={false}
                    >
                      Review In Inventory
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="default"
                onClick={() => navigate('/dashboard/eod-summary')}
                showIcon={false}
              >
                Open Full EOD Detail
              </Button>
            </Stack>
          </Paper>
        )}

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
          onFixSubmit={handleFixSubmit}
          onReviewInInventory={handleAlertReviewInInventory}
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
