import React, { useMemo } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useDishProfitability } from './hooks/useDishProfitability';

const currency = (value: number) =>
  `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Stat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
          {value}
        </Typography>
        {helper && (
          <Typography variant="caption" color="text.secondary">
            {helper}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function DishProfitability() {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    search,
    setSearch,
    category,
    setCategory,
    sortKey,
    setSortKey,
    query,
    items,
    categories,
    summary,
    topBottom,
    setQuickRange,
  } = useDishProfitability();

  const isLoading = query.isLoading || query.isFetching;
  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <Stack spacing={3}>
        <Card
          sx={{ borderRadius: 3, boxShadow: '0 20px 60px rgba(15,23,42,0.12)', overflow: 'hidden' }}
        >
          <CardContent>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
              Profit & Waste Analytics
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Dish Profitability
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Latest food cost per dish using the most recent delivered purchase order price per
              ingredient and batch recipe costs.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
              >
                <TextField
                  label="Start date"
                  type="date"
                  value={startDate || ''}
                  onChange={e => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label="End date"
                  type="date"
                  value={endDate || ''}
                  onChange={e => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <Stack direction="row" spacing={1}>
                  {[30, 60, 90].map(days => (
                    <Chip
                      key={days}
                      label={`Last ${days}d`}
                      variant="outlined"
                      onClick={() => setQuickRange(days)}
                    />
                  ))}
                </Stack>
                <TextField
                  label="Search dishes"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  size="small"
                  sx={{ minWidth: 220 }}
                />
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
              >
                <Autocomplete
                  options={categories}
                  value={category}
                  onChange={(_, val) => setCategory(val || '')}
                  renderInput={params => (
                    <TextField {...params} label="Category" placeholder="All" size="small" />
                  )}
                  sx={{ minWidth: 220, maxWidth: 320 }}
                />
                <ToggleButtonGroup
                  exclusive
                  value={sortKey}
                  onChange={(_, val) => val && setSortKey(val)}
                  size="small"
                  color="primary"
                >
                  <ToggleButton value="margin">Sort by margin</ToggleButton>
                  <ToggleButton value="foodCost">Sort by food cost %</ToggleButton>
                  <ToggleButton value="revenue">Sort by revenue</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Stat
              label="Avg margin"
              value={currency(summary.avgMargin)}
              helper="Price - food cost"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stat
              label="Avg food cost %"
              value={`${summary.avgFoodCostPct.toFixed(1)}%`}
              helper="Across listed dishes"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stat label="Dishes" value={`${items.length}`} helper="Filtered results" />
          </Grid>
        </Grid>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Margin table
            </Typography>
            {query.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {query.error instanceof Error
                  ? query.error.message
                  : 'Unable to load dish profitability.'}
              </Alert>
            )}
            {isLoading ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Calculating food costs…
                </Typography>
              </Stack>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Dish</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Food cost</TableCell>
                      <TableCell align="right">Food cost %</TableCell>
                      <TableCell align="right">Margin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.menu_item_id} hover>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.category || '—'}</TableCell>
                        <TableCell align="right">{currency(item.price)}</TableCell>
                        <TableCell align="right">{currency(item.total_food_cost)}</TableCell>
                        <TableCell align="right">{item.food_cost_pct.toFixed(1)}%</TableCell>
                        <TableCell align="right">{currency(item.gross_margin)}</TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No dishes found for the selected filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Top performers
                </Typography>
                <Stack spacing={1.25}>
                  {topBottom.top.map(item => (
                    <Stack
                      key={item.menu_item_id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.category || 'Uncategorized'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2">{currency(item.gross_margin)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Food cost {item.food_cost_pct.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                  {topBottom.top.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No dishes available.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Watchlist (lowest margin)
                </Typography>
                <Stack spacing={1.25}>
                  {topBottom.bottom.map(item => (
                    <Stack
                      key={item.menu_item_id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.category || 'Uncategorized'}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2">{currency(item.gross_margin)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Food cost {item.food_cost_pct.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                  {topBottom.bottom.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No dishes available.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

export default DishProfitability;
