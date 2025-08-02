import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, Button, TextField } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function TopBottomItemsChart({ data, byRevenue, setByRevenue }) {
  const theme = useTheme();
  const [top, setTop] = useState(true);
  const [count, setCount] = useState(3);

  const displayedData = top
    ? data.slice(0, count)
    : [...data].slice(-count).reverse();

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
          {top ? "Top" : "Bottom"} {count} Items
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            fontSize: "0.875rem",
          }}
        >
          <TextField
            type="number"
            size="small"
            inputProps={{ min: 1, max: 10 }}
            value={count}
            onChange={(e) =>
              setCount(Math.min(10, Math.max(1, Number(e.target.value))))
            }
            sx={{ width: 70 }}
          />

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant={top ? "contained" : "outlined"}
              size="small"
              onClick={() => setTop(true)}
            >
              Top
            </Button>
            <Button
              variant={!top ? "contained" : "outlined"}
              size="small"
              onClick={() => setTop(false)}
            >
              Bottom
            </Button>
          </Box>
        </Box>
      </Box>

      {!displayedData.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No top/bottom items found.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={displayedData}>
            <XAxis
              dataKey="menu_item_name"
              stroke={theme.palette.text.primary}
            />
            <YAxis stroke={theme.palette.text.primary} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
              }}
            />
            <Bar
              dataKey="metric"
              name={byRevenue ? "Revenue" : "Quantity"}
              fill={theme.palette.primary.main}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
