import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography, Stack, CircularProgress, Paper } from "@mui/material";
import DateSelector from "../../../components/DateSelector"; // Your date picker component
import SalesBreakdownChart from "../charts/SalesBreakdownChart";
import SalesOverTimeChart from "../charts/SalesOverTimeChart";
import TopBottomItemsChart from "../charts/TopBottomItemsChart";
import useMenuMixInsights from "../hooks/useMenuMixInsights";
import FilterButtons from "../../../components/FilterButtons";
import { PageHeader } from "../../../components/PageHeader";
import Button from "../../../components/Button"; // If you want, can replace this with MUI Button too

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function MenuMixInsightsBasic() {
  const defaultEndDate = getDateNDaysAgo(0);
  const defaultStartDate = getDateNDaysAgo(7);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [byRevenue, setByRevenue] = useState(true);

  const startDateStr =
    startDate instanceof Date
      ? startDate.toISOString().slice(0, 10)
      : startDate;
  const endDateStr =
    endDate instanceof Date ? endDate.toISOString().slice(0, 10) : endDate;

  const {
    breakdownData,
    overTimeData,
    topBottomData,
    selectedMenuItemIds,
    setSelectedMenuItemIds,
    loading,
  } = useMenuMixInsights(startDateStr, endDateStr, byRevenue);

  const allMenuItems = useMemo(() => {
    const combined = [...breakdownData, ...overTimeData, ...topBottomData];
    return Array.from(
      new Map(
        combined.map(({ menu_item_id, menu_item_name }) => [
          menu_item_id,
          menu_item_name,
        ])
      )
    );
  }, [breakdownData, overTimeData, topBottomData]);

  useEffect(() => {
    if (allMenuItems.length > 0 && selectedMenuItemIds.length === 0) {
      setSelectedMenuItemIds(allMenuItems.map(([id]) => id));
    }
  }, [allMenuItems, selectedMenuItemIds, setSelectedMenuItemIds]);

  const filteredBreakdownData =
    selectedMenuItemIds.length === 0
      ? breakdownData
      : breakdownData.filter((item) =>
          selectedMenuItemIds.includes(item.menu_item_id)
        );

  const filteredOverTimeData =
    selectedMenuItemIds.length === 0
      ? overTimeData
      : overTimeData.filter((item) =>
          selectedMenuItemIds.includes(item.menu_item_id)
        );

  const chartDataByDate = useMemo(() => {
    if (!filteredOverTimeData || filteredOverTimeData.length === 0) return [];

    const grouped = {};
    for (const { sale_date, menu_item_name, metric } of filteredOverTimeData) {
      if (!sale_date || !menu_item_name) continue;

      if (!grouped[sale_date]) grouped[sale_date] = { date: sale_date };

      grouped[sale_date][menu_item_name] = metric;
    }
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOverTimeData]);

  const filteredTopBottomData =
    selectedMenuItemIds.length === 0
      ? topBottomData
      : topBottomData.filter((item) =>
          selectedMenuItemIds.includes(item.menu_item_id)
        );

  return (
    <Paper
        sx={{
          maxWidth: 1200,
          mt: 4,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 8 },
        }}
      >
      <PageHeader title="Menu Mix Insights" />

      <Box sx={{ my: 3, maxWidth: 600, mx: "auto" }}>
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

      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Button
          toggle
          toggleState={byRevenue}
          onToggle={setByRevenue}
          toggleLabels={["Revenue $", "Quantity"]}
          variant="outlined"
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <FilterButtons
          items={allMenuItems.map(([id, name]) => ({ id, name }))}
          selectedItems={selectedMenuItemIds}
          setSelectedItems={setSelectedMenuItemIds}
          label="Filter by Menu Items"
          allLabel="All Menu Items"
        />
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }} variant="body1" color="text.secondary">
            Loading charts...
          </Typography>
        </Box>
      ) : (
        <Stack spacing={6}>
          <SalesBreakdownChart
            data={filteredBreakdownData}
            byRevenue={byRevenue}
          />
          <SalesOverTimeChart data={chartDataByDate} byRevenue={byRevenue} />
          <TopBottomItemsChart
            data={filteredTopBottomData}
            byRevenue={byRevenue}
          />
        </Stack>
      )}
    </Paper>
  );
}
