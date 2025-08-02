import React, { useState, useMemo } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Checkbox,
  TableContainer,
  Paper,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

export default function TableShell({
  columns = [],
  data = [],
  defaultSortKey = null,
  defaultSortOrder = "asc",
  loading = false,
  emptyMessage = "No records found.",
  compact = false,
  maxHeight = 400,
  searchable = true,
  showCheckboxes = true,
}) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const cellValue = row[col.key];
        if (cellValue == null) return false;
        return String(cellValue).toLowerCase().includes(lowerQuery);
      })
    );
  }, [data, searchQuery, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortOrder]);

  const toggleRowSelection = (id) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedData.map((r) => r.id)));
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <Box width="100%" display="flex" flexDirection="column" gap={2}>
      {searchable && (
        <TextField
          variant="outlined"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size={compact ? "small" : "medium"}
          fullWidth
        />
      )}

      <TableContainer
        component={Paper}
        sx={{
          maxHeight,
          bgcolor: "background.paper",
          overflowY: "auto",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Table
          stickyHeader
          size={compact ? "small" : "medium"}
          aria-label="table"
        >
          <TableHead>
            <TableRow>
              {showCheckboxes && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedRows.size > 0 &&
                      selectedRows.size < sortedData.length
                    }
                    checked={
                      sortedData.length > 0 &&
                      selectedRows.size === sortedData.length
                    }
                    onChange={toggleSelectAll}
                    inputProps={{ "aria-label": "select all rows" }}
                  />
                </TableCell>
              )}

              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  sortDirection={sortKey === col.key ? sortOrder : false}
                  sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortOrder : "asc"}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showCheckboxes ? 1 : 0)}
                  align="center"
                >
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (showCheckboxes ? 1 : 0)}
                  align="center"
                >
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, idx) => {
                const isSelected = selectedRows.has(row.id);
                return (
                  <TableRow
                    hover
                    key={row.id || idx}
                    selected={isSelected}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={-1}
                    sx={{
                      bgcolor: isSelected ? "primary.light" : "inherit",
                    }}
                  >
                    {showCheckboxes && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row.id)}
                          inputProps={{ "aria-label": `select row ${row.id}` }}
                        />
                      </TableCell>
                    )}

                    {columns.map((col) => (
                      <TableCell key={col.key} sx={{ whiteSpace: "nowrap" }}>
                        {typeof col.render === "function"
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
