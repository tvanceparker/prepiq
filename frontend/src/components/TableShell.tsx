import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Checkbox as MUICheckbox,
  TableContainer,
  Paper,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import type { TableShellProps } from '../interfaces/table';

export default function TableShell<T = any>({
  columns = [],
  data = [],
  defaultSortKey = null,
  defaultSortOrder = 'asc',
  loading = false,
  emptyMessage = 'No records found.',
  compact = false,
  maxHeight = 400,
  searchable = true,
  showCheckboxes = true,
}: TableShellProps<T>): JSX.Element {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey as any);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((row: any) =>
      columns.some((col: any) => {
        const cellValue = row[col.key];
        if (cellValue == null) return false;
        return String(cellValue).toLowerCase().includes(lowerQuery);
      })
    );
  }, [data, searchQuery, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData as any[];
    return [...(filteredData as any[])].sort((a, b) => {
      const aVal = a[sortKey as any];
      const bVal = b[sortKey as any];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortOrder]);

  const toggleRowSelection = (id: string | number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === (sortedData as any[]).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set((sortedData as any[]).map((r: any) => r.id)));
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <Box width="100%" display="flex" flexDirection="column" gap={2}>
      {searchable && (
        <TextField
          variant="outlined"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          size={compact ? 'small' : 'medium'}
          fullWidth
        />
      )}

      <TableContainer
        component={Paper}
        sx={{
          maxHeight,
          bgcolor: 'background.paper',
          overflowY: 'auto',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Table stickyHeader size={compact ? 'small' : 'medium'} aria-label="table">
          <TableHead>
            <TableRow>
              {showCheckboxes && (
                <TableCell padding="checkbox">
                  <MUICheckbox
                    indeterminate={
                      selectedRows.size > 0 && selectedRows.size < (sortedData as any[]).length
                    }
                    checked={
                      (sortedData as any[]).length > 0 &&
                      selectedRows.size === (sortedData as any[]).length
                    }
                    onChange={toggleSelectAll}
                    inputProps={{ 'aria-label': 'select all rows' }}
                  />
                </TableCell>
              )}

              {columns.map((col: any) => (
                <TableCell
                  key={col.key}
                  sortDirection={sortKey === col.key ? (sortOrder as any) : false}
                  sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortOrder : 'asc'}
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
                <TableCell colSpan={columns.length + (showCheckboxes ? 1 : 0)} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : (sortedData as any[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (showCheckboxes ? 1 : 0)} align="center">
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              (sortedData as any[]).map((row: any, idx: number) => {
                const isSelected = selectedRows.has(row.id);
                return (
                  <TableRow
                    hover
                    key={row.id || idx}
                    selected={isSelected}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={-1}
                    sx={{ bgcolor: isSelected ? 'primary.light' : 'inherit' }}
                  >
                    {showCheckboxes && (
                      <TableCell padding="checkbox">
                        <MUICheckbox
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row.id)}
                          inputProps={{ 'aria-label': `select row ${row.id}` }}
                        />
                      </TableCell>
                    )}

                    {columns.map((col: any) => (
                      <TableCell key={col.key} sx={{ whiteSpace: 'nowrap' }}>
                        {typeof col.render === 'function'
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
