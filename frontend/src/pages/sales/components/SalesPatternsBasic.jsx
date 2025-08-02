import React, { useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  ButtonGroup,
  Button as MuiButton,
} from "@mui/material";
import { useSalesPatterns } from "../hooks/useSalesPatterns";
import SalesPatternsOverTimeChart from "../charts/SalesPatternsOverTimeChart";
import SalesHeatmap from "../charts/SalesPatternsVisualizer";
import WeekdayAvgChart from "../charts/WeekdayAvgChart";
import SalesChannelBreakdownChart from "../charts/SalesChannelBreakdownChart";
import { PageHeader } from "../../../components/PageHeader";
import DateSelector from "../../../components/DateSelector";
import Button from "../../../components/Button";

export default function SalesPatternsBasic() {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    byRevenue,
    setByRevenue,
    normalize,
    setNormalize,
    salesOverTime,
    heatmapData,
    weekdayAvg,
    channelBreakdown,
    loading,
    error,
  } = useSalesPatterns();

  // State for layout mode: "grid" (2 columns) or "single" (1 column)
  const [layoutMode, setLayoutMode] = useState("grid");

  // Prepare charts config to map easily
  const charts = [
    {
      title: "Sales Over Time by Item",
      component: <SalesPatternsOverTimeChart data={salesOverTime} />,
    },
    {
      title: "Sales Heatmap",
      component: (
        <SalesHeatmap
          data={heatmapData}
          normalize={normalize}
          onNormalizeChange={setNormalize}
        />
      ),
    },
    {
      title: "Average Sales by Weekday",
      component: <WeekdayAvgChart data={weekdayAvg} />,
    },
    {
      title: "Sales Channel Breakdown",
      component: <SalesChannelBreakdownChart data={channelBreakdown} />,
    },
  ];

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
      <PageHeader title="Sales Patterns" />

      {/* Controls */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        spacing={2}
        maxWidth={800}
        mx="auto"
        mb={3}
        width="100%"
      >
        <DateSelector
          label="Select Date Range"
          startDate={new Date(startDate)}
          endDate={new Date(endDate)}
          onStartDateChange={(date) =>
            setStartDate(date.toISOString().slice(0, 10))
          }
          onEndDateChange={(date) =>
            setEndDate(date.toISOString().slice(0, 10))
          }
          mode="range"
          direction="backward"
        />

        <Button
          toggle
          toggleState={byRevenue}
          onToggle={(state) => setByRevenue(state)}
          toggleLabels={["Viewing: Revenue", "Viewing: Count"]}
          toggleVariants={["confirm", "default"]}
        />

        <Button
          toggle
          toggleState={normalize}
          onToggle={(state) => setNormalize(state)}
          toggleLabels={["Normalize Off", "Normalize On"]}
          toggleVariants={["default", "confirm"]}
        />
      </Stack>

      {/* Layout toggle buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 4,
        }}
      >
        <ButtonGroup
          variant="outlined"
          color="primary"
          aria-label="layout toggle"
        >
          <MuiButton
            variant={layoutMode === "grid" ? "contained" : "outlined"}
            onClick={() => setLayoutMode("grid")}
          >
            Grid View
          </MuiButton>
          <MuiButton
            variant={layoutMode === "single" ? "contained" : "outlined"}
            onClick={() => setLayoutMode("single")}
          >
            Single Column View
          </MuiButton>
        </ButtonGroup>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: 2, alignSelf: "center" }}
          >
            Loading data...
          </Typography>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ maxWidth: 800, mx: "auto", mb: 3 }}>
          Error loading data: {error.message}
        </Alert>
      )}

      {/* Content */}
      {!loading && !error && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              layoutMode === "grid" ? { xs: "1fr", md: "1fr 1fr" } : "1fr",
            gap: 4,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {charts.map(({ title, component }) => (
            <Box
              key={title}
              sx={{
                height: layoutMode === "grid" ? 360 : 500,
                display: "flex",
                flexDirection: "column",
                p: 3,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                boxShadow: (theme) => theme.shadows[1],
                bgcolor: (theme) => theme.palette.background.paper,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                overflow: "auto", // ✅ allow scroll if children overflow
              }}
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{ mb: 2, color: "text.primary", fontWeight: 600 }}
              >
                {title}
              </Typography>
              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  overflow: "hidden",
                  // Ensure charts fill container in single-column mode
                  height: layoutMode === "grid" ? "auto" : "100%",
                }}
              >
                {component}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
