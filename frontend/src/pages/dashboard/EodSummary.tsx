import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';

import { fetchLatestEodSummary } from '../../api/eod';
import { PageHeader } from '../../components/PageHeader';
import type { EodRunSummary } from '../../interfaces/eod';

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');

const formatAuthorityLabel = (authority: EodRunSummary['forecast']['forecast_authority']) => {
  if (authority === 'finalized_eod') return 'Finalized EOD';
  if (authority === 'on_demand_preview') return 'On-demand Preview';
  return 'Unavailable';
};

const getDecisionColor = (action: EodRunSummary['downstream']['forecast_action']) =>
  action === 'allow' ? 'success' : action === 'review' ? 'warning' : 'error';

export default function EodSummary(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<EodRunSummary>({
    queryKey: ['latest-eod-summary'],
    queryFn: fetchLatestEodSummary,
  });

  const runStatusColor =
    data?.status === 'success'
      ? 'success'
      : data?.status === 'partial'
        ? 'warning'
        : data?.status === 'failed'
          ? 'error'
          : 'info';

  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto', mt: 4, px: { xs: 2, md: 4 }, pb: 6 }}>
      <PageHeader title="EOD Detail" />

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          borderRadius: 4,
          background:
            'radial-gradient(circle at top left, rgba(24,91,78,0.16), transparent 42%), linear-gradient(135deg, #17352d 0%, #245648 48%, #f2e3bf 160%)',
          color: 'common.white',
          overflow: 'hidden',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
          <Box sx={{ maxWidth: 700 }}>
            <Typography variant="overline" sx={{ opacity: 0.82, letterSpacing: 1.2 }}>
              EOD Deep Dive
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5, mb: 1, fontWeight: 700 }}>
              Trace the run, understand the failure points, and move directly into repair.
            </Typography>
            <Typography sx={{ opacity: 0.88, maxWidth: 560 }}>
              This view keeps forecast trust, stage completion, warnings, and repair targets in one
              place so operators can move from summary to action without guessing.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="flex-start">
            <Paper
              sx={{ p: 1.5, minWidth: 120, bgcolor: 'rgba(255,255,255,0.12)', color: 'inherit' }}
            >
              <Typography variant="overline" sx={{ opacity: 0.72 }}>
                Run Status
              </Typography>
              <Typography variant="h5">{data?.status?.toUpperCase() ?? '...'}</Typography>
            </Paper>
            <Paper
              sx={{ p: 1.5, minWidth: 120, bgcolor: 'rgba(255,255,255,0.12)', color: 'inherit' }}
            >
              <Typography variant="overline" sx={{ opacity: 0.72 }}>
                Open Review
              </Typography>
              <Typography variant="h5">{data?.counts.open_discrepancy_count ?? 0}</Typography>
            </Paper>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3 }}>
          <Button variant="outlined" color="inherit" onClick={() => navigate('/dashboard/alerts')}>
            Back To Alerts
          </Button>
          <Button variant="contained" onClick={() => navigate('/inventory/table')}>
            Open Inventory Review
          </Button>
        </Stack>
      </Paper>

      {isLoading && (
        <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Paper>
      )}

      {error && (
        <Paper sx={{ p: 3 }}>
          <Typography color="error">Failed to load EOD summary.</Typography>
        </Paper>
      )}

      {data && (
        <Stack spacing={3}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Latest Run
                </Typography>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {data.status_message}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Run date {data.run_date}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Started {data.started_at ? new Date(data.started_at).toLocaleString() : 'n/a'}
                  {' · '}
                  Finished {data.finished_at ? new Date(data.finished_at).toLocaleString() : 'n/a'}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="flex-start">
                <Chip color={runStatusColor} label={data.status.toUpperCase()} />
                <Chip
                  variant="outlined"
                  label={`Forecast ${data.forecast.forecast_status.toUpperCase()}`}
                />
                <Chip
                  variant="outlined"
                  label={`${data.counts.sales_usage_log_count} sales deductions`}
                />
                <Chip
                  variant="outlined"
                  label={`${data.counts.purchase_order_suggestion_count} suggestions`}
                />
                <Chip
                  variant="outlined"
                  label={`${data.counts.purchase_orders_created} draft POs`}
                />
                <Chip
                  variant="outlined"
                  label={`${data.counts.open_discrepancy_count} open reviews`}
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              What To Do Next
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {data.guidance.headline}
            </Typography>
            <Stack spacing={1}>
              {data.guidance.steps.map(step => (
                <Typography key={step} variant="body2" color="text.secondary">
                  • {step}
                </Typography>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Forecast Trust
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
              <Chip
                label={formatAuthorityLabel(data.forecast.forecast_authority)}
                variant="outlined"
              />
              <Chip
                color={getDecisionColor(data.forecast.forecast_usage_action)}
                label={`Forecast ${data.forecast.forecast_usage_action.toUpperCase()}`}
              />
              <Chip
                color={getDecisionColor(data.downstream.reorder_action)}
                variant="outlined"
                label={`Reorder ${data.downstream.reorder_action.toUpperCase()}`}
              />
              <Chip
                color={getDecisionColor(data.downstream.purchase_orders_action)}
                variant="outlined"
                label={`Draft POs ${data.downstream.purchase_orders_action.toUpperCase()}`}
              />
            </Stack>
            <Typography variant="body1">{data.forecast.forecast_status_message}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {data.forecast.forecast_usage_message}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {data.downstream.message}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Generated{' '}
              {data.forecast.forecast_generated_at
                ? new Date(data.forecast.forecast_generated_at).toLocaleString()
                : 'n/a'}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Stage Status
            </Typography>
            <Stack spacing={1.5}>
              {data.stages.map(stage => (
                <Stack
                  key={stage.stage}
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                >
                  <Typography sx={{ textTransform: 'capitalize' }}>
                    {formatStageLabel(stage.stage)}
                  </Typography>
                  <Typography color={stage.completed ? 'success.main' : 'text.secondary'}>
                    {stage.completed ? 'Completed' : 'Pending'}
                    {stage.duration_ms != null ? ` · ${Math.round(stage.duration_ms / 1000)}s` : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Errors And Warnings
            </Typography>
            {data.errors.length === 0 ? (
              <Typography color="text.secondary">No recorded EOD errors for this run.</Typography>
            ) : (
              <Stack spacing={1}>
                {data.errors.map(errorItem => (
                  <Box key={`${errorItem.stage}-${errorItem.ts ?? errorItem.message}`}>
                    <Typography color="error.main" sx={{ textTransform: 'capitalize' }}>
                      {formatStageLabel(errorItem.stage)}
                    </Typography>
                    <Typography variant="body2">{errorItem.message}</Typography>
                    {errorItem.ts && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(errorItem.ts).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Repair Targets
            </Typography>
            {data.repair_targets.length === 0 ? (
              <Typography color="text.secondary">
                No open inventory repair targets for this run.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {data.repair_targets.map(target => (
                  <Stack
                    key={`${target.alert_id ?? 'no-alert'}-${target.ingredient_id ?? target.batch_recipe_id ?? target.item_name}`}
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ md: 'center' }}
                  >
                    <Box>
                      <Typography>{target.item_name || 'Inventory item'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {target.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Shortfall {target.shortfall_quantity} {target.unit || ''}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        navigate('/inventory/table', {
                          state: {
                            focusReview: {
                              alertId: target.alert_id,
                              ingredientId: target.ingredient_id,
                              batchRecipeId: target.batch_recipe_id,
                            },
                          },
                        })
                      }
                    >
                      Review In Inventory
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
