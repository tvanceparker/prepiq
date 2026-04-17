import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/Button';
import useAlertsFeed from '../hooks/useAlertsFeed';
import useMediaQuery from '../hooks/useMediaQuery';
import AlertsFeedTableBasic from './AlertsFeedTableBasic';
import { fetchLatestEodSummary } from '../../../api/eod';
import type { EodRunSummary } from '../../../interfaces/eod';
import { alpha, useTheme } from '@mui/material/styles';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';

type FeedFilter = 'all' | 'priority' | 'inventory' | 'data' | 'unacknowledged' | 'fixable';

const highSignalAlertTypes = new Set([
  'MissingSalesData',
  'Inventory:DeductionFailed',
  'prep_incomplete',
]);

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');

const formatAuthorityLabel = (authority: EodRunSummary['forecast']['forecast_authority']) => {
  if (authority === 'finalized_eod') return 'Finalized EOD';
  if (authority === 'on_demand_preview') return 'On-demand Preview';
  return 'Unavailable';
};

const getDecisionColor = (action: EodRunSummary['downstream']['forecast_action']) =>
  action === 'allow' ? 'success' : action === 'review' ? 'warning' : 'error';

const getAlertFamily = (alertType: string) => {
  if (alertType.startsWith('Inventory:')) return 'Inventory';
  if (alertType.startsWith('DataQuality:')) return 'Data Quality';
  return 'Operations';
};

const getSeverityRank = (severity: string) => {
  switch (severity) {
    case 'urgent':
      return 4;
    case 'error':
      return 3;
    case 'warning':
      return 2;
    default:
      return 1;
  }
};

const isHighSignalAlert = (alert: { alert_type: string; severity: string }) =>
  highSignalAlertTypes.has(alert.alert_type) || getSeverityRank(alert.severity) >= 3;

const getForecastStatusColor = (status: EodRunSummary['forecast']['forecast_status']) =>
  status === 'failed'
    ? 'error'
    : status === 'degraded' || status === 'stale'
      ? 'warning'
      : 'success';

export default function AlertsFeedBasic(): JSX.Element {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const theme = useTheme();

  const [viewAll, setViewAll] = useState(false);
  const [useCardView, setUseCardView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('priority');

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
  const forecastStatusColor = eodSummary
    ? getForecastStatusColor(eodSummary.forecast.forecast_status)
    : 'default';

  const severityColors = useMemo<Record<string, string>>(
    () => ({
      info: theme.palette.info.main,
      warning: theme.palette.warning.main,
      urgent: theme.palette.error.main,
      error: theme.palette.error.main,
    }),
    [theme]
  );

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((left, right) => {
      const highSignalDelta = Number(isHighSignalAlert(right)) - Number(isHighSignalAlert(left));
      if (highSignalDelta !== 0) return highSignalDelta;

      const severityDelta = getSeverityRank(right.severity) - getSeverityRank(left.severity);
      if (severityDelta !== 0) return severityDelta;

      const leftPriority = isFixable(left) ? 1 : 0;
      const rightPriority = isFixable(right) ? 1 : 0;
      if (rightPriority !== leftPriority) return rightPriority - leftPriority;

      const leftAck = left.is_acknowledged ? 1 : 0;
      const rightAck = right.is_acknowledged ? 1 : 0;
      if (leftAck !== rightAck) return leftAck - rightAck;

      const leftCreated = new Date(left.created_at ?? 0).getTime();
      const rightCreated = new Date(right.created_at ?? 0).getTime();
      return rightCreated - leftCreated;
    });
  }, [alerts, isFixable]);

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return sortedAlerts.filter(alert => {
      if (feedFilter === 'priority') {
        const isPriority = isHighSignalAlert(alert);
        if (!isPriority) return false;
      }

      if (feedFilter === 'inventory' && !alert.alert_type.startsWith('Inventory:')) return false;
      if (feedFilter === 'data' && !alert.alert_type.startsWith('DataQuality:')) return false;
      if (feedFilter === 'unacknowledged' && alert.is_acknowledged) return false;
      if (feedFilter === 'fixable' && !isFixable(alert)) return false;

      if (!search) return true;

      const haystack = [
        alert.alert_type,
        alert.title,
        alert.message,
        alert.employee_id,
        alert.role,
        JSON.stringify(alert.meta ?? {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [feedFilter, isFixable, searchTerm, sortedAlerts]);

  const summaryStats = useMemo(() => {
    const highSignalCount = alerts.filter(alert => isHighSignalAlert(alert)).length;
    const fixableCount = alerts.filter(alert => isFixable(alert)).length;
    const inventoryCount = alerts.filter(alert => alert.alert_type.startsWith('Inventory:')).length;
    const dataQualityCount = alerts.filter(alert =>
      alert.alert_type.startsWith('DataQuality:')
    ).length;
    const reviewCount = alerts.filter(alert => !alert.is_acknowledged).length;

    return {
      total: alerts.length,
      highSignalCount,
      fixableCount,
      inventoryCount,
      dataQualityCount,
      reviewCount,
    };
  }, [alerts]);

  const spotlightAlerts = filteredAlerts.filter(alert => isHighSignalAlert(alert)).slice(0, 3);
  const visibleSpotlightAlerts =
    spotlightAlerts.length > 0 ? spotlightAlerts : filteredAlerts.slice(0, 3);
  const quickFilters: Array<{ key: FeedFilter; label: string; count: number }> = [
    { key: 'priority', label: 'Trust Blockers', count: summaryStats.highSignalCount },
    { key: 'inventory', label: 'Inventory', count: summaryStats.inventoryCount },
    { key: 'data', label: 'Data Quality', count: summaryStats.dataQualityCount },
    { key: 'unacknowledged', label: 'Needs Ack', count: summaryStats.reviewCount },
    { key: 'fixable', label: 'Fix Now', count: summaryStats.fixableCount },
    { key: 'all', label: 'All Visible', count: summaryStats.total },
  ];

  const groupedSections = useMemo(() => {
    const sections: Array<{
      key: string;
      title: string;
      subtitle: string;
      alerts: typeof filteredAlerts;
    }> = [];
    const usedIds = new Set<string | number>();

    const takeSection = (
      key: string,
      title: string,
      subtitle: string,
      predicate: (alert: (typeof filteredAlerts)[number]) => boolean
    ) => {
      const sectionAlerts = filteredAlerts.filter(
        alert => !usedIds.has(alert.alert_id) && predicate(alert)
      );
      sectionAlerts.forEach(alert => usedIds.add(alert.alert_id));
      if (sectionAlerts.length > 0) {
        sections.push({ key, title, subtitle, alerts: sectionAlerts });
      }
    };

    takeSection(
      'trust',
      'Trust Blockers',
      'Alerts most likely to change whether you can trust EOD, forecast, or inventory outputs.',
      alert => isHighSignalAlert(alert)
    );
    takeSection(
      'repair',
      'Fix Now',
      'Records you can correct immediately to reduce queue noise and restore trust faster.',
      alert => !isHighSignalAlert(alert) && isFixable(alert)
    );
    takeSection(
      'inventory',
      'Inventory Watch',
      'Stock issues that affect deduction confidence and reorder trust.',
      alert => alert.alert_type.startsWith('Inventory:')
    );
    takeSection(
      'data',
      'Data Quality',
      'Input cleanup that improves the quality of downstream decisions.',
      alert => alert.alert_type.startsWith('DataQuality:')
    );
    takeSection(
      'operations',
      'Operations',
      'Everything else that still needs review, acknowledgement, or closure.',
      () => true
    );

    return sections;
  }, [filteredAlerts, isFixable]);

  const heroBackground =
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #3f0b17 0%, #6b1028 52%, #7c2d12 100%)'
      : 'linear-gradient(135deg, #7f1d1d 0%, #be123c 52%, #f59e0b 155%)';

  const heroOverlay =
    theme.palette.mode === 'dark'
      ? 'radial-gradient(circle at top right, rgba(255,255,255,0.10), transparent 34%), radial-gradient(circle at bottom left, rgba(15,23,42,0.34), transparent 44%)'
      : 'radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at bottom left, rgba(69,10,10,0.28), transparent 44%)';

  const metricSurfaceColor = alpha(
    theme.palette.common.white,
    theme.palette.mode === 'dark' ? 0.08 : 0.14
  );
  const panelSurfaceColor =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.94)
      : theme.palette.background.paper;

  return (
    <>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: 'background.default' }}>
        <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
          <Paper
            elevation={0}
            sx={{
              mb: 2.5,
              p: { xs: 2.5, md: 3 },
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              color: 'common.white',
              background: heroBackground,
              border: '1px solid',
              borderColor: alpha(theme.palette.common.white, 0.12),
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: heroOverlay,
              }}
            />

            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              justifyContent="space-between"
              spacing={3}
              sx={{ position: 'relative' }}
            >
              <Box sx={{ maxWidth: 760 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.common.white, 0.14),
                    }}
                  >
                    <NotificationsActiveOutlinedIcon />
                  </Box>
                  <Typography variant="overline" sx={{ letterSpacing: 1.6, opacity: 0.88 }}>
                    Operator Queue
                  </Typography>
                </Stack>
                <Typography variant="h3" sx={{ mt: 0.25, fontWeight: 800, lineHeight: 1.05 }}>
                  Alerts & Issues Feed
                </Typography>
                <Typography variant="body1" sx={{ mt: 1.25, maxWidth: 640, opacity: 0.92 }}>
                  Focus the team on the alerts that can actually change tonight’s outcome, move
                  directly into repair workflows, and keep the latest trust signal visible while you
                  work the queue.
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.25 }}>
                  <Chip
                    label={`${summaryStats.highSignalCount} trust blockers`}
                    sx={{ bgcolor: metricSurfaceColor, color: 'common.white' }}
                  />
                  <Chip
                    label={`${summaryStats.fixableCount} fix now`}
                    sx={{ bgcolor: metricSurfaceColor, color: 'common.white' }}
                  />
                  <Chip
                    label={`${summaryStats.reviewCount} needs ack`}
                    sx={{ bgcolor: metricSurfaceColor, color: 'common.white' }}
                  />
                </Stack>
              </Box>

              <Stack
                direction="row"
                spacing={1.5}
                useFlexGap
                flexWrap="wrap"
                alignItems="flex-start"
              >
                <Paper
                  sx={{ p: 1.5, minWidth: 128, bgcolor: metricSurfaceColor, color: 'inherit' }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.72 }}>
                    Total
                  </Typography>
                  <Typography variant="h4">{summaryStats.total}</Typography>
                </Paper>
                <Paper
                  sx={{ p: 1.5, minWidth: 128, bgcolor: metricSurfaceColor, color: 'inherit' }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.72 }}>
                    Inventory
                  </Typography>
                  <Typography variant="h4">{summaryStats.inventoryCount}</Typography>
                </Paper>
                <Paper
                  sx={{ p: 1.5, minWidth: 128, bgcolor: metricSurfaceColor, color: 'inherit' }}
                >
                  <Typography variant="overline" sx={{ opacity: 0.72 }}>
                    Data Quality
                  </Typography>
                  <Typography variant="h4">{summaryStats.dataQualityCount}</Typography>
                </Paper>
              </Stack>
            </Stack>
          </Paper>

          {eodSummary && (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                mb: 3,
                borderRadius: 3,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.info.main, 0.08)
                    : alpha(theme.palette.info.light, 0.14),
                borderColor: alpha(theme.palette.info.main, 0.22),
              }}
            >
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
                    color={eodSummary.is_historical ? 'warning' : 'default'}
                    variant={eodSummary.is_historical ? 'filled' : 'outlined'}
                    label={eodSummary.is_historical ? 'Historical Review' : 'Latest Finalized Run'}
                  />
                  <Chip
                    color={forecastStatusColor}
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
                  <Chip
                    variant="outlined"
                    label={`${eodSummary.counts.purchase_orders_created} draft POs`}
                  />
                </Stack>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {eodSummary.forecast.forecast_status_message}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={formatAuthorityLabel(eodSummary.forecast.forecast_authority)}
                />
                <Chip
                  size="small"
                  color={getDecisionColor(eodSummary.forecast.forecast_usage_action)}
                  label={`Forecast ${eodSummary.forecast.forecast_usage_action.toUpperCase()}`}
                />
                <Chip
                  size="small"
                  color={getDecisionColor(eodSummary.downstream.reorder_action)}
                  variant="outlined"
                  label={`Reorder ${eodSummary.downstream.reorder_action.toUpperCase()}`}
                />
                <Chip
                  size="small"
                  color={getDecisionColor(eodSummary.downstream.purchase_orders_action)}
                  variant="outlined"
                  label={`Draft POs ${eodSummary.downstream.purchase_orders_action.toUpperCase()}`}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {eodSummary.forecast.forecast_usage_message}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {eodSummary.downstream.message}
              </Typography>
              {eodSummary.guidance.steps[0] && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  Next step: {eodSummary.guidance.steps[0]}
                </Typography>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {eodSummary.guidance.headline}
                </Typography>
                <Stack spacing={0.5}>
                  {eodSummary.guidance.steps.slice(0, 3).map(step => (
                    <Typography key={step} variant="body2" color="text.secondary">
                      • {step}
                    </Typography>
                  ))}
                </Stack>
              </Box>

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

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 3,
              borderRadius: 3,
              bgcolor: panelSurfaceColor,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', xl: 'row' }}
                justifyContent="space-between"
                spacing={2}
                alignItems={{ xl: 'center' }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Queue Controls
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewAll
                      ? 'Viewing all alerts, including resolved work.'
                      : 'Showing active work that still needs operator attention.'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {filteredAlerts.length} alerts match the current queue filters.
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
                  gap: 1.5,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(theme.palette.error.main, 0.06) }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Trust Blockers
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {summaryStats.highSignalCount}
                  </Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.warning.main, 0.06),
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Fix Now
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {summaryStats.fixableCount}
                  </Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha(theme.palette.info.main, 0.06) }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Inventory Queue
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {summaryStats.inventoryCount}
                  </Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.success.main, 0.06),
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Needs Acknowledgement
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {summaryStats.reviewCount}
                  </Typography>
                </Paper>
              </Box>

              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Quick Filters
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {quickFilters.map(filter => (
                      <Chip
                        key={filter.key}
                        clickable
                        color={feedFilter === filter.key ? 'primary' : 'default'}
                        variant={feedFilter === filter.key ? 'filled' : 'outlined'}
                        label={`${filter.label} · ${filter.count}`}
                        onClick={() => setFeedFilter(filter.key)}
                        sx={{ fontWeight: feedFilter === filter.key ? 700 : 500 }}
                      />
                    ))}
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, minWidth: { lg: 340 } }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Search Queue
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="Search by type, message, ingredient, employee, or metadata"
                  />
                </Paper>
              </Stack>
            </Stack>
          </Paper>

          {visibleSpotlightAlerts.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Trust Spotlight
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                {visibleSpotlightAlerts.map(alert => (
                  <Paper
                    key={`spotlight-${alert.alert_id}`}
                    variant="outlined"
                    sx={{
                      p: 2.25,
                      borderRadius: 3,
                      flex: 1,
                      borderColor: alpha(
                        severityColors[alert.severity] || theme.palette.divider,
                        0.45
                      ),
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.background.paper, 0.92)
                          : alpha(theme.palette.background.paper, 0.98),
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        size="small"
                        color={getSeverityRank(alert.severity) >= 3 ? 'error' : 'warning'}
                        label={alert.severity.toUpperCase()}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={getAlertFamily(alert.alert_type)}
                      />
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                      {alert.title || alert.alert_type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {alert.message}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Button
                        variant="default"
                        onClick={() => setFeedFilter('priority')}
                        showIcon={false}
                      >
                        Keep In Queue
                      </Button>
                      {alert.alert_type === 'Inventory:DeductionFailed' && (
                        <Button
                          variant="confirm"
                          onClick={() => handleAlertReviewInInventory(alert)}
                          showIcon={false}
                        >
                          {alert.action_label || 'Review Inventory'}
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {typeof error === 'string' ? error : ((error as any)?.message ?? String(error))}
            </Alert>
          )}

          {groupedSections.map(section => (
            <Box key={section.key} sx={{ mb: 3 }}>
              <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                <Typography variant="h6">{section.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {section.subtitle}
                </Typography>
              </Stack>
              <AlertsFeedTableBasic
                alerts={section.alerts}
                loading={loading}
                isCardView={useCardView}
                isFixable={isFixable}
                onFixSubmit={handleFixSubmit}
                onReviewInInventory={handleAlertReviewInInventory}
                onResolve={handleResolve}
                onAcknowledge={handleAcknowledge}
                severityColors={severityColors}
              />
            </Box>
          ))}

          {!loading && filteredAlerts.length === 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.9)
                    : alpha(theme.palette.background.paper, 0.98),
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                Nothing matches this view.
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Clear the search, switch the queue filter, or view all alerts to widen the list.
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Button variant="default" onClick={() => setSearchTerm('')} showIcon={false}>
                  Clear Search
                </Button>
                <Button variant="clearFilter" onClick={() => setFeedFilter('all')} showIcon={false}>
                  Show All
                </Button>
              </Stack>
            </Paper>
          )}

          {hasMore && filteredAlerts.length > 0 && (
            <Stack mt={4} justifyContent="center" alignItems="center">
              <Button onClick={loadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

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
