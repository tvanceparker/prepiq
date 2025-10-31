import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function SalesOverTimeChart({ data, byRevenue }) {
  const theme = useTheme();

  // Extract all menu item names from the keys of the first data point (excluding "date")
  const itemNames =
    data.length > 0 ? Object.keys(data[0]).filter((key) => key !== "date") : [];

  const colors = [
    "#0fb9b1",
    "#ff6b6b",
    "#4b7bec",
    "#20bf6b",
    "#f7b731",
    "#8854d0",
  ];

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 2,
        p: 3,
        boxShadow: theme.shadows[1],
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h6" component="h2">
          Sales Over Time – {byRevenue ? "Revenue $" : "Quantity"}
        </Typography>
      </Box>

      {!data?.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No sales over time data available.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid
              stroke={
                theme.palette.mode === "dark"
                  ? theme.palette.divider
                  : "#d1d5db"
              }
            />
            <XAxis
              dataKey="date"
              stroke={
                theme.palette.mode === "dark"
                  ? theme.palette.text.primary
                  : "#111827"
              }
            />
            <YAxis
              stroke={
                theme.palette.mode === "dark"
                  ? theme.palette.text.primary
                  : "#111827"
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            />
            <Legend />
            {itemNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name}
                stroke={colors[index % colors.length]}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
