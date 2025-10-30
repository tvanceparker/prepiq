import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useInventoryTable } from './hooks/useInventoryTable';
import PackagingPopper from './components/PackagingPopper';
import ChipInfoPopper from './components/ChipInfoPopper';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { InventoryItem, LotBreakdown } from '../../interfaces/inventory';

export default function InventoryTable() {
  const theme = useTheme();

  const { inventory, loading, error } = useInventoryTable();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedLots, setSelectedLots] = useState<LotBreakdown[]>([]);
  const [batchRecipeId, setBatchRecipeId] = useState<number | null>(null);

  const [chipAnchor, setChipAnchor] = useState<HTMLElement | null>(null);
  const [activeLotId, setActiveLotId] = useState<number | null>(null);
  const [chipType, setChipType] = useState<'added' | 'used' | 'wasted' | null>(null);

  const openChipPopper = Boolean(chipAnchor);

  const handleChipClick = useCallback((
    event: React.MouseEvent<HTMLDivElement>,
    lotId: number,
    type: string
  ) => {
    setChipAnchor(event.currentTarget);
    setActiveLotId(lotId);
    setChipType(type as 'added' | 'used' | 'wasted');
  }, []);

  const handlePackagingClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    breakdown: LotBreakdown[],
    batchId: number | null
  ) => {
    if (anchorEl) {
      setAnchorEl(null);
      setSelectedLots([]);
      setBatchRecipeId(null);
    } else {
      setAnchorEl(event.currentTarget);
      setSelectedLots(breakdown);
      setBatchRecipeId(batchId);
    }
  }, [anchorEl]);

  const columns = useMemo<MRT_ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: 'ingredient_name',
        header: 'Ingredient',
        size: 150,
        enableGrouping: true,
        Cell: ({ cell }) => {
          const name = cell.getValue<string>();
          const isBatchRecipe = cell.row.original.batch_recipe_id !== null;
          return (
            <Typography
              variant="body1"
              sx={{ fontWeight: isBatchRecipe ? 'bold' : 'normal' }}
              color={isBatchRecipe ? 'primary.main' : 'text.primary'}
            >
              {name} {isBatchRecipe && '(Batch)'}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        size: 100,
        enableGrouping: true,
      },
      {
        accessorKey: 'quantity_on_hand',
        header: 'Quantity On Hand',
        size: 80,
        enableAggregation: true,
        aggregationFn: 'sum',
        Cell: ({ cell }) => {
          if (cell.getIsGrouped()) {
            return <strong>{cell.getValue<number>()}</strong>;
          }
          const value = cell.getValue<number>();
          return (
            <Typography
              sx={{
                fontWeight: 'bold',
                color: value > 0 ? theme.palette.success.main : theme.palette.error.main,
              }}
            >
              {value}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        size: 50,
      },
      {
        accessorKey: 'packaging_breakdown',
        header: 'Movements',
        size: 110,
        enableColumnFilter: false,
        Cell: ({ cell }) => {
          const row = cell.row.original;
          const breakdown = cell.getValue<LotBreakdown[]>();
          return (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<InventoryIcon />}
              onClick={(e) => handlePackagingClick(e, breakdown, row.batch_recipe_id || null)}
            >
              {breakdown?.length || 0}
            </Button>
          );
        },
      },
    ],
    [theme.palette.error.main, theme.palette.success.main, handlePackagingClick]
  );

  if (loading) return <Typography>Loading inventory...</Typography>;
  if (error) return <Typography color="error">Error: {error.message}</Typography>;

  return (
    <Box sx={{ padding: 2 }}>
      <MaterialReactTable
        columns={columns}
        data={inventory}
        enableRowSelection={false}
        enableColumnFilters
        enableGrouping
        enableExpanding={true}
        enableColumnOrdering
        enablePinning
        initialState={{
          density: 'comfortable',
          columnVisibility: {},
          grouping: ['category'],
          columnFilters: [],
          showColumnFilters: true,
        }}
        muiTableBodyRowProps={({ row }) => ({
          onClick: () => {
            if (row.getIsGrouped()) {
              row.toggleExpanded();
            }
          },
          sx: {
            backgroundColor:
              row.index % 2 === 0 ? theme.palette.background.paper : theme.palette.action.hover,
            cursor: row.getIsGrouped() ? 'pointer' : 'default',
          },
        })}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: theme.palette.action.selected,
            fontWeight: 'bold',
          },
        }}
        displayColumnDefOptions={{
          'mrt-row-expand': {
            size: 0,
            enableResizing: false,
            Cell: () => null,
          },
        }}
      />

      <PackagingPopper
        anchorEl={anchorEl}
        lots={selectedLots}
        batchRecipeId={batchRecipeId}
        onClose={() => setAnchorEl(null)}
        onChipClick={handleChipClick}
      />
      <ChipInfoPopper
        anchorEl={chipAnchor}
        lotId={activeLotId}
        type={chipType}
        open={openChipPopper}
        onClose={() => {
          setChipAnchor(null);
          setActiveLotId(null);
          setChipType(null);
        }}
      />
    </Box>
  );
}
