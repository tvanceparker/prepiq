import React, { useMemo, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { useActivityLogs } from "../hooks/useActivityLogs";
import { PageHeader } from "../../../components/PageHeader";
import { Box, Paper, Typography, useTheme, Tooltip } from "@mui/material";

export default function ActivityLogsBasic() {
  const theme = useTheme();
  const { data: activityLogs = [], isLoading, error } = useActivityLogs();
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      {
        accessorKey: "activity_id",
        header: "ID",
        enableSorting: true,
      },
      {
        accessorKey: "employee_name",
        header: "Employee",
        enableSorting: true,
        Cell: ({ cell }) =>
          cell.getValue() ? (
            cell.getValue()
          ) : (
            <Typography
              component="span"
              sx={{ color: "text.disabled", fontStyle: "italic" }}
            >
              Unknown
            </Typography>
          ),
      },
      {
        accessorKey: "employee_id",
        header: "Employee ID",
        enableSorting: true,
      },
      {
        accessorKey: "action",
        header: "Action",
        enableSorting: true,
      },
      {
        accessorKey: "details",
        header: "Details",
        enableSorting: false,
        Cell: ({ cell }) => (
          <Tooltip title={cell.getValue() || ""} arrow>
            <Box
              sx={{
                maxWidth: 300,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: "help",
              }}
            >
              {cell.getValue()}
            </Box>
          </Tooltip>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        enableSorting: true,
        Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString(),
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
          enablePagination={true}
          enableSorting={true}
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
          enableBottomToolbar={true}
          enableTopToolbar={true}
        />
      </Paper>
    </Paper>
  );
}
