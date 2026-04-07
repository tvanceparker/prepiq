import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';

import { fetchLatestEodSummary } from '../../api/eod';
import { PageHeader } from '../../components/PageHeader';
import type { EodRunSummary } from '../../interfaces/eod';

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');

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
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, px: { xs: 2, md: 4 }, pb: 6 }}>
      <PageHeader title="EOD Detail" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 3 }}>
        <Button variant="outlined" onClick={() => navigate('/dashboard/alerts')}>
          Back To Alerts
        </Button>
        <Button variant="contained" onClick={() => navigate('/inventory/table')}>
          Open Inventory Review
        </Button>
      </Stack>

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
          <Paper sx={{ p: 3 }}>
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

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Forecast Trust
            </Typography>
            <Typography variant="body1">{data.forecast.forecast_status_message}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Generated{' '}
              {data.forecast.forecast_generated_at
                ? new Date(data.forecast.forecast_generated_at).toLocaleString()
                : 'n/a'}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
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

          <Paper sx={{ p: 3 }}>
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

          <Paper sx={{ p: 3 }}>
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
