import React, { useContext } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, useTheme } from "@mui/material";
import { AuthContext } from "../../../contexts/AuthContext";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function WeekdayAvgChart({ data }) {
  const { theme: authTheme } = useContext(AuthContext);
  const muiTheme = useTheme();

  const isDark = authTheme === "dark";

  const borderColor = muiTheme.palette.divider;
  const textSecondary = muiTheme.palette.text.secondary;
  const textPrimary = muiTheme.palette.text.primary;
  const surface = muiTheme.palette.background.paper;
  const primaryColor = muiTheme.palette.primary.main;

  // Custom teal accent for the bars and tooltip in both modes:
  const accentTeal = isDark
    ? "rgba(15, 185, 177, 0.8)"
    : "rgba(11, 114, 133, 0.8)";

  if (!data || data.length === 0)
    return (
      <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
        No weekday average data available.
      </Typography>
    );

  const mappedData = data
    .map(({ weekday, average_value }) => ({
      weekday,
      name: dayNames[weekday] || "Unknown",
      average_value,
    }))
    .sort((a, b) => a.weekday - b.weekday);

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer>
        <BarChart
          data={mappedData}
          margin={{ top: 20, right: 5, bottom: 5 }}
        >
          <CartesianGrid stroke={borderColor} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            stroke={textSecondary}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke={textSecondary}
            tick={{ fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: surface,
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
            }}
            labelStyle={{ color: textPrimary }}
            itemStyle={{ color: accentTeal }}
            formatter={(value) => value.toLocaleString()}
          />
          <Bar dataKey="average_value" fill={accentTeal} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
