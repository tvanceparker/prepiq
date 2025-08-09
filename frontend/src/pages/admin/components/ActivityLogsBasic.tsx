import React, { useMemo, useState } from "react";
import { MaterialReactTable, type MRT_ColumnDef } from "material-react-table";
import { useActivityLogs } from "../hooks/useActivityLogs";
import { PageHeader } from "../../../components/PageHeader";
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { ActivityLogResponse } from "../../../interfaces/admin";

export default function ActivityLogsBasic() {
  const theme = useTheme();
  const { data: activityLogs = [], isLoading, error } = useActivityLogs();
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const columns = useMemo<MRT_ColumnDef<ActivityLogResponse>[]>(
    () => [
      { accessorKey: "activity_id", header: "ID", enableSorting: true },
      {
        accessorKey: "employee_name",
        header: "Employee",
        enableSorting: true,
        Cell: ({ cell }) => {
          const value = cell.getValue() as string | undefined;
          return value ? (
            value
          ) : (
            <Typography
              component="span"
              sx={{ color: "text.disabled", fontStyle: "italic" }}
            >
              Unknown
            </Typography>
          );
        },
      },
      {
        accessorKey: "employee_id",
        header: "Employee ID",
        enableSorting: true,
      },
      { accessorKey: "action", header: "Action", enableSorting: true },
      {
        accessorKey: "details",
        header: "Details",
        enableSorting: false,
        Cell: ({ cell }) => {
          const value = cell.getValue() as string | undefined;
          return (
            <Tooltip title={value || ""} arrow>
              <Box
                sx={{
                  maxWidth: 300,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  cursor: "help",
                }}
              >
                {value ?? ""}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Date",
        enableSorting: true,
        Cell: ({ cell }) => {
          const value = cell.getValue() as string;
          return new Date(value).toLocaleString();
        },
      },
    ],
    []
  );

  if (error) {
    return (
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          py: { xs: 4, md: 8 },
          px: { xs: 2, md: 4 },
        }}
      >
        <PageHeader title="Activity Log" />
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" color="error">
            Error loading activity logs.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Render skeleton table if loading
  if (isLoading) {
    // Number of skeleton rows to display (adjust as you like)
    const skeletonRows = 6;

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
        <PageHeader title="Activity Log" />

        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            component="table"
            sx={{ width: "100%", borderCollapse: "collapse" }}
          >
            <Box component="thead">
              <Box component="tr">
                {columns.map((col) => (
                  <Box
                    component="th"
                    key={col.accessorKey}
                    sx={{
                      textAlign: "left",
                      p: 1,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      fontWeight: "bold",
                    }}
                  >
                    {col.header}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {[...Array(skeletonRows)].map((_, i) => (
                <Box
                  component="tr"
                  key={i}
                  sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  {columns.map((col, idx) => (
                    <Box component="td" key={idx} sx={{ p: 1 }}>
                      <Skeleton variant="text" />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Paper>
    );
  }

  // Render actual table with data when loaded
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
      <PageHeader title="Activity Log" />

      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <MaterialReactTable
          columns={columns}
          data={activityLogs}
          state={{
            isLoading,
            showGlobalFilter: true,
            globalFilter,
            columnVisibility: {
              activity_id: false,
              employee_id: false,
            },
          }}
          onGlobalFilterChange={setGlobalFilter}
          enableColumnFilters={false}
          enablePagination
          enableSorting
          muiTableContainerProps={{ sx: { maxHeight: 600 } }}
          initialState={{ sorting: [{ id: "created_at", desc: true }] }}
          muiToolbarAlertBannerProps={
            error
              ? {
                  color: "error",
                  children: "Error loading activity logs",
                }
              : undefined
          }
          enableBottomToolbar
          enableTopToolbar
        />
      </Paper>
    </Paper>
  );
}
