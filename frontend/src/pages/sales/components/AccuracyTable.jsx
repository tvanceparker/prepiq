import React from "react";
import TableShell from "../../../components/TableShell"; // Keep your custom table component
import { Box, Typography, useTheme } from "@mui/material";

const AccuracyTable = ({ data }) => {
  const theme = useTheme();

  if (!data.length) {
    return (
      <Box mb={8}>
        <Typography color={theme.palette.text.secondary}>
          No forecast accuracy summary data available.
        </Typography>
      </Box>
    );
  }

  const showDate = data.some((item) => item.source === "daily");

  const columns = [
    ...(showDate
      ? [
          {
            key: "date",
            label: "Date",
            render: (value) => value || "-",
          },
        ]
      : []),
    {
      key: "menu_item_name",
      label: "Menu Item",
    },
    {
      key: "forecasted",
      label: "Forecasted Total",
      render: (value) => value.toLocaleString(),
    },
    {
      key: "actual",
      label: "Actual Total",
      render: (value) => value.toLocaleString(),
    },
    {
      key: "forecast_error",
      label: "Total Error",
      render: (value) => value ?? "-",
    },
    {
      key: "error_percentage",
      label: "Error %",
      render: (value) => (value != null ? `${value.toFixed(2)}%` : "-"),
    },
    {
      key: "source",
      label: "Source",
    },
  ];

  return (
    <Box mb={8}>
      <Typography
        variant="h6"
        gutterBottom
        color={theme.palette.text.primary}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        📋 Forecast Accuracy Summary (Overall Forecast Period)
      </Typography>
      <TableShell
        columns={columns}
        data={data}
        showCheckboxes={false}
        emptyMessage="No data available for the forecast accuracy summary."
      />
    </Box>
  );
};

export default AccuracyTable;
