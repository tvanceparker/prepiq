import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Typography, Box, useTheme } from "@mui/material";

export default function SalesChannelBreakdownChart({ data }) {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 2 }}
      >
        No sales channel data available.
      </Typography>
    );
  }

  // Use MUI theme palette colors for pie slices cycling through primary, secondary, and info
  const pieColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.info.main,
  ];

  return (
    <Box width="100%" height={300}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="sales_channel"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ sales_channel }) => sales_channel}
            labelStyle={{
              fontWeight: "bold",
              fill: theme.palette.text.primary,
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={pieColors[index % pieColors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              borderRadius: theme.shape.borderRadius,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[1],
              color: theme.palette.text.primary,
            }}
            labelStyle={{ color: theme.palette.text.secondary }}
            itemStyle={{ color: theme.palette.primary.main }}
            formatter={(value) =>
              value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }
          />
          <Legend
            wrapperStyle={{ color: theme.palette.text.secondary }}
            verticalAlign="bottom"
            height={36}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}
