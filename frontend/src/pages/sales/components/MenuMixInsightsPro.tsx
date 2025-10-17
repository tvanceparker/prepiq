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
        breakdownData.filter(item => item.item_name).map(item => [item.item_name, item.item_name])
      )
    ).map(([name]) => ({ id: name as unknown as number, name: name || '' }));
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
      : breakdownData.filter(item => selectedMenuItemIds.includes(item.item_name as any));

  const filteredOverTimeData = selectedMenuItemIds.length === 0 ? overTimeData : overTimeData;

  const chartDataByDate = useMemo(() => {
    if (!filteredOverTimeData || filteredOverTimeData.length === 0) return [];

    const grouped: Record<string, any> = {};
    for (const item of filteredOverTimeData) {
      const date = item.sale_date;
      if (!grouped[date]) grouped[date] = { date };
      // For Pro tier, we could aggregate by item or show totals
      grouped[date].metric =
        (grouped[date].metric || 0) + (byRevenue ? item.revenue : item.quantity);
    }
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOverTimeData, byRevenue]);

  const filteredTopBottomData =
    selectedMenuItemIds.length === 0
      ? topBottomData
      : topBottomData.filter(item => selectedMenuItemIds.includes(item.item_name as any));

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
      <PageHeader title="Menu Mix Insights - Pro Tier" />

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
                      <TableCell>{item.item_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {item.channel ? <Chip label={item.channel} size="small" /> : '—'}
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
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
