/**
 * Pro Tier Menu Mix Insights
 * Extends Basic tier with cost analysis and profitability metrics
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import DateSelector from '../../../components/DateSelector';
import SalesBreakdownChart from '../charts/SalesBreakdownChart';
import SalesOverTimeChart from '../charts/SalesOverTimeChart';
import TopBottomItemsChart from '../charts/TopBottomItemsChart';
import useMenuMixInsightsPro from '../hooks/useMenuMixInsightsPro';
import { getSalesDateRange } from '../../../api/forecast';
import FilterButtons from '../../../components/FilterButtons';
import { PageHeader } from '../../../components/PageHeader';
import Button from '../../../components/Button';

function getDateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function MenuMixInsightsPro() {
  const defaultEndDate = getDateNDaysAgo(0);
  const defaultStartDate = getDateNDaysAgo(7);

  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(defaultEndDate);
  const [byRevenue, setByRevenue] = useState(true);

  useEffect(() => {
    let isActive = true;

    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const clampStartDate = (start: Date, min?: Date) => {
      if (!min) return start;
      return start < min ? min : start;
    };

    const refreshRange = async () => {
      try {
        const range = await getSalesDateRange();
        if (!isActive || !range?.max_date) return;

        const minDate = range.min_date ? normalizeDate(new Date(range.min_date)) : undefined;
        const maxDate = normalizeDate(new Date(range.max_date));

        const currentStart = normalizeDate(startDate);
        const currentEnd = normalizeDate(endDate);

        const outOfRange = (minDate && currentEnd < minDate) || currentStart > maxDate;
        if (outOfRange) {
          const newEnd = maxDate;
          const newStartCandidate = new Date(maxDate);
          newStartCandidate.setDate(newStartCandidate.getDate() - 7);
          const newStart = clampStartDate(newStartCandidate, minDate);
          if (isActive) {
            setStartDate(newStart);
            setEndDate(newEnd);
          }
        }
      } catch (err) {
        console.error('Failed to load sales date range:', err);
      }
    };

    refreshRange();
    return () => {
      isActive = false;
    };
  }, [startDate, endDate]);

  const startDateStr =
    startDate instanceof Date ? startDate.toISOString().slice(0, 10) : String(startDate);
  const endDateStr = endDate instanceof Date ? endDate.toISOString().slice(0, 10) : String(endDate);

  const {
    breakdownData,
    overTimeData,
    topBottomData,
    selectedMenuItemIds,
    setSelectedMenuItemIds,
    loading,
  } = useMenuMixInsightsPro(startDateStr, endDateStr, byRevenue);

  // Extract unique menu items from breakdown data
  const allMenuItems = useMemo(() => {
    return Array.from(
      new Map(
        breakdownData
          .filter(item => item.menu_item_name)
          .map(item => [item.menu_item_id, item.menu_item_name])
      )
    ).map(([id, name]) => ({ id: id as number, name: String(name || '') }));
  }, [breakdownData]);

  useEffect(() => {
    if (allMenuItems.length > 0 && selectedMenuItemIds.length === 0) {
      setSelectedMenuItemIds(allMenuItems.map(item => item.id));
    }
  }, [allMenuItems, selectedMenuItemIds, setSelectedMenuItemIds]);

  // Filter data based on selected items
  const filteredBreakdownData =
    selectedMenuItemIds.length === 0
      ? breakdownData
      : breakdownData.filter(item => selectedMenuItemIds.includes(item.menu_item_id));

  const filteredOverTimeData =
    selectedMenuItemIds.length === 0
      ? overTimeData
      : overTimeData.filter(item => selectedMenuItemIds.includes(item.menu_item_id));

  const chartDataByDate = useMemo(() => {
    if (!filteredOverTimeData || filteredOverTimeData.length === 0) return [];

    const grouped: Record<string, any> = {};
    for (const item of filteredOverTimeData) {
      const date = item.sale_date;
      const itemName = item.menu_item_name || `Item ${item.menu_item_id}`;
      if (!grouped[date]) grouped[date] = { date };
      // Create individual column for each menu item
      grouped[date][itemName] = byRevenue ? item.revenue : item.quantity;
    }
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOverTimeData, byRevenue]);

  const filteredTopBottomData =
    selectedMenuItemIds.length === 0
      ? topBottomData
      : topBottomData.filter(item => selectedMenuItemIds.includes(item.menu_item_id));

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  // Format percentage
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Get color for margin percentage
  const getMarginColor = (marginPct: number) => {
    if (marginPct >= 60) return 'success';
    if (marginPct >= 40) return 'warning';
    return 'error';
  };

  return (
    <Paper
      sx={{
        maxWidth: 1400,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      <PageHeader title="Menu Mix Insights - Full Tier" />

      <Box sx={{ my: 3, maxWidth: 600, mx: 'auto' }}>
        <DateSelector
          label="Select Date Range"
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          mode="range"
          direction="backward"
        />
      </Box>

      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Button
          toggle
          toggleState={byRevenue}
          onToggle={setByRevenue}
          toggleLabels={['Revenue $', 'Quantity']}
          variant="outlined"
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <FilterButtons
          items={allMenuItems}
          selectedItems={selectedMenuItemIds}
          setSelectedItems={setSelectedMenuItemIds}
          label="Filter by Menu Items"
          allLabel="All Menu Items"
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }} variant="body1" color="text.secondary">
            Loading profitability analysis...
          </Typography>
        </Box>
      ) : (
        <Stack spacing={6}>
          {/* Profitability Table */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Item Profitability Analysis
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Item</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Channel</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Qty</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Revenue</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Recipe Cost</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Total Cost</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Profit</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Margin %</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Food Cost %</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBreakdownData.map((item, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{item.menu_item_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {item.sales_channel ? (
                          <Chip label={item.sales_channel} size="small" />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">{item.quantity_sold}</TableCell>
                      <TableCell align="right">{formatCurrency(item.revenue)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.recipe_cost)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.total_cost)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.contribution_margin)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatPercent(item.gross_margin_pct)}
                          color={getMarginColor(item.gross_margin_pct)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{formatPercent(item.food_cost_pct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          {/* Existing Charts */}
          <SalesBreakdownChart data={filteredBreakdownData} byRevenue={byRevenue} />
          <SalesOverTimeChart data={chartDataByDate} byRevenue={byRevenue} />
          <TopBottomItemsChart
            data={filteredTopBottomData}
            byRevenue={byRevenue}
            setByRevenue={setByRevenue}
          />
        </Stack>
      )}
    </Paper>
  );
}
