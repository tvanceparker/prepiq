import React, { useContext, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Button,
  ButtonGroup,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { AuthContext } from "../../../contexts/AuthContext";

// Create matrix for heatmap table
const createHeatmapMatrix = (data) => {
  const dates = [...new Set(data.map((d) => d.date))].sort();
  const items = [...new Set(data.map((d) => d.menu_item_name))];

  const matrix = items.map((item) => {
    const row = { menu_item_name: item };
    dates.forEach((date) => {
      const match = data.find(
        (d) => d.menu_item_name === item && d.date === date
      );
      row[date] = match?.value || 0;
    });
    return row;
  });

  return { matrix, dates };
};

export default function SalesPatternsVisualizer({ data }) {
  const { theme: authTheme } = useContext(AuthContext);
  const muiTheme = useTheme();
  const isDark = authTheme === "dark";

  const [view, setView] = useState("bar-category");

  const primaryColor = muiTheme.palette.primary.main;
  const textPrimary = muiTheme.palette.text.primary;
  const textSecondary = muiTheme.palette.text.secondary;
  const background = muiTheme.palette.background.paper;
  const borderColor = muiTheme.palette.divider;

  const byItem = useMemo(() => data?.by_menu_item || [], [data]);
  const byCategory = useMemo(() => data?.by_category || [], [data]);

  const { matrix, dates } = useMemo(
    () => createHeatmapMatrix(byItem),
    [byItem]
  );

  const barCategoryData = useMemo(() => {
    const aggregated = {};
    for (const entry of byCategory) {
      aggregated[entry.category] =
        (aggregated[entry.category] || 0) + entry.value;
    }
    return Object.entries(aggregated).map(([category, value]) => ({
      category,
      value,
    }));
  }, [byCategory]);

  const barItemData = useMemo(() => {
    const aggregated = {};
    for (const entry of byItem) {
      aggregated[entry.menu_item_name] =
        (aggregated[entry.menu_item_name] || 0) + entry.value;
    }
    return Object.entries(aggregated).map(([menu_item_name, value]) => ({
      menu_item_name,
      value,
    }));
  }, [byItem]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header + ButtonGroup inline */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h6" sx={{ color: textPrimary }}>
          Sales Heatmap
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button
            onClick={() => setView("bar-category")}
            variant={view === "bar-category" ? "contained" : "outlined"}
          >
            Category
          </Button>
          <Button
            onClick={() => setView("bar-item")}
            variant={view === "bar-item" ? "contained" : "outlined"}
          >
            Menu Item
          </Button>
          <Button
            onClick={() => setView("heatmap")}
            variant={view === "heatmap" ? "contained" : "outlined"}
          >
            Heatmap
          </Button>
        </ButtonGroup>
      </Box>

      {/* Main content area with fixed height */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {/* Bar Chart: Category */}
        {view === "bar-category" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barCategoryData}
              margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid stroke={borderColor} strokeDasharray="3 3" />
              <XAxis dataKey="category" stroke={textSecondary} />
              <YAxis stroke={textSecondary} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: background,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                }}
                labelStyle={{ color: textPrimary }}
                itemStyle={{ color: primaryColor }}
              />
              <Bar dataKey="value" fill={primaryColor} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Bar Chart: Menu Item */}
        {view === "bar-item" && (
          <Box sx={{ width: "100%", height: "100%", overflowX: "auto" }}>
            <Box sx={{ minWidth: barItemData.length * 60, height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barItemData}
                  margin={{ top: 20, right: 20, left: 10, bottom: -5 }}
                >
                  <CartesianGrid stroke={borderColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="menu_item_name"
                    stroke={textSecondary}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke={textSecondary} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: background,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: textPrimary }}
                    itemStyle={{ color: primaryColor }}
                  />
                  <Bar dataKey="value" fill={primaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}

        {/* Heatmap */}
        {view === "heatmap" && (
          <TableContainer
            component={Paper}
            sx={{
              width: "100%",
              height: "100%",
              border: 1,
              borderColor,
              borderRadius: 1,
              overflow: "auto",
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      backgroundColor: background,
                      fontWeight: "bold",
                      color: textSecondary,
                      borderColor,
                    }}
                  >
                    Menu Item
                  </TableCell>
                  {dates.map((date) => (
                    <TableCell
                      key={date}
                      align="center"
                      sx={{
                        fontSize: "0.75rem",
                        color: textSecondary,
                        borderColor,
                        minWidth: 60,
                      }}
                    >
                      {new Date(date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {matrix.map((row) => {
                  const maxVal = Math.max(...dates.map((d) => row[d] || 0));
                  return (
                    <TableRow key={row.menu_item_name} hover>
                      <TableCell
                        sx={{
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                          backgroundColor: background,
                          fontWeight: 500,
                          color: textPrimary,
                          borderColor,
                        }}
                      >
                        {row.menu_item_name}
                      </TableCell>
                      {dates.map((date) => {
                        const val = row[date] || 0;
                        const alpha =
                          maxVal === 0 ? 0 : 0.1 + (val / maxVal) * 0.9;
                        const bgColor = isDark
                          ? `rgba(15, 185, 177, ${alpha.toFixed(2)})`
                          : `rgba(11, 114, 133, ${alpha.toFixed(2)})`;
                        return (
                          <TableCell
                            key={date}
                            align="center"
                            title={`Sales: ${val}`}
                            sx={{
                              backgroundColor: bgColor,
                              color: textPrimary,
                              fontSize: "0.75rem",
                              fontWeight: "medium",
                              borderColor,
                              minWidth: 60,
                            }}
                          >
                            {val > 0 ? val.toFixed(0) : ""}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
