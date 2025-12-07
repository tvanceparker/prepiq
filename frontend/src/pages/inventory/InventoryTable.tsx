import React, { useState, useMemo, useCallback } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Snackbar,
  Paper,
  Stack,
  Typography,
  useTheme,
  Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import LayersIcon from '@mui/icons-material/Layers';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useInventoryTable } from './hooks/useInventoryTable';
import PackagingPopper from './components/PackagingPopper';
import ChipInfoPopper from './components/ChipInfoPopper';
import LotAdjustDialog from './components/LotAdjustDialog';
import { InventoryItem, LotBreakdown, IngredientStockLevel } from '../../interfaces/inventory';

export default function InventoryTable() {
  const theme = useTheme();

  const {
    inventory,
    loading,
    error,
    stockLevels,
    stockLoading,
    stockError,
    adjustInventory,
    adjusting,
  } = useInventoryTable();

  const [filterType, setFilterType] = useState<'all' | 'ingredients' | 'batches'>('all');

  const filterOptions: Array<{ key: 'all' | 'ingredients' | 'batches'; label: string }> = [
    { key: 'all', label: 'All items' },
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'batches', label: 'Batch recipes' },
  ];

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedLots, setSelectedLots] = useState<LotBreakdown[]>([]);
  const [batchRecipeId, setBatchRecipeId] = useState<number | null>(null);
  const [activeInventoryRow, setActiveInventoryRow] = useState<InventoryItem | null>(null);

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustLotId, setAdjustLotId] = useState<number | null>(null);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const [chipAnchor, setChipAnchor] = useState<HTMLElement | null>(null);
  const [activeLotId, setActiveLotId] = useState<number | null>(null);
  const [chipType, setChipType] = useState<'added' | 'used' | 'wasted' | null>(null);

  const openChipPopper = Boolean(chipAnchor);

  const handleChipClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, lotId: number, type: string) => {
      setChipAnchor(event.currentTarget);
      setActiveLotId(lotId);
      setChipType(type as 'added' | 'used' | 'wasted');
    },
    []
  );

  const handlePackagingClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, row: InventoryItem) => {
      if (anchorEl) {
        setAnchorEl(null);
        setSelectedLots([]);
        setBatchRecipeId(null);
        setActiveInventoryRow(null);
      } else {
        setAnchorEl(event.currentTarget);
        setSelectedLots(row.packaging_breakdown);
        setBatchRecipeId(row.batch_recipe_id || null);
        setActiveInventoryRow(row);
      }
    },
    [anchorEl]
  );

  const handlePopperClose = () => {
    setAnchorEl(null);
    setSelectedLots([]);
    setBatchRecipeId(null);
    setActiveInventoryRow(null);
  };

  const handleOpenAdjustDialog = (lotId: number) => {
    if (!activeInventoryRow) return;
    setAdjustLotId(lotId);
    setAdjustDialogOpen(true);
    setAnchorEl(null);
  };

  const handleAdjustSubmit = async (payload: {
    inventory_id: number;
    lot_id: number;
    adjustment_quantity: number;
    usage_type: string;
    notes?: string;
  }) => {
    try {
      await adjustInventory(payload);
      setToast({ open: true, message: 'Inventory adjusted', severity: 'success' });
      setAdjustDialogOpen(false);
    } catch (err: any) {
      setToast({
        open: true,
        message: err?.message || 'Adjustment failed',
        severity: 'error',
      });
      throw err;
    }
  };

  const filteredInventory = useMemo(() => {
    if (filterType === 'ingredients') {
      return inventory.filter(item => item.batch_recipe_id === null);
    }
    if (filterType === 'batches') {
      return inventory.filter(item => item.batch_recipe_id !== null);
    }
    return inventory;
  }, [filterType, inventory]);

  const stats = useMemo(() => {
    const categories = new Set<string>();
    let totalLots = 0;
    let totalOnHand = 0;

    filteredInventory.forEach(item => {
      if (item.category) categories.add(item.category);
      totalLots += item.packaging_breakdown?.length || 0;
      totalOnHand += item.quantity_on_hand || 0;
    });

    return {
      items: filteredInventory.length,
      categories: categories.size,
      lots: totalLots,
      onHand: totalOnHand,
    };
  }, [filteredInventory]);

  const reorderBuckets = useMemo(() => {
    const belowOrAt: IngredientStockLevel[] = [];
    const nearing: IngredientStockLevel[] = [];

    stockLevels.forEach(level => {
      if (
        level.status === 'critical' ||
        level.status === 'low' ||
        level.current_stock <= level.reorder_point
      ) {
        belowOrAt.push(level);
      } else if (level.status === 'warning') {
        nearing.push(level);
      }
    });

    return {
      belowOrAt,
      nearing,
    };
  }, [stockLevels]);

  const formatNumber = (value: number) =>
    Number.isFinite(value) ? value.toLocaleString('en-US') : '0';

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
              startIcon={<Inventory2Icon />}
              onClick={e => handlePackagingClick(e, row)}
            >
              {breakdown?.length || 0}
            </Button>
          );
        },
      },
    ],
    [theme.palette.error.main, theme.palette.success.main, handlePackagingClick]
  );

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={320} gap={2}>
        <CircularProgress color="primary" />
        <Typography color="text.secondary">Loading inventory...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={320}>
        <Typography color="error">Error: {error.message}</Typography>
      </Box>
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={360}
        gap={1.5}
        sx={{ textAlign: 'center' }}
      >
        <Inventory2Icon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          No inventory found yet
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Add ingredients or batches to start tracking stock movements
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.primary.main, 0.12)})`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Inventory Pulse
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Grouped by category with quick filters for ingredients or batch recipes
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            {filterOptions.map(filter => (
              <Chip
                key={filter.key}
                label={filter.label}
                color={filterType === filter.key ? 'primary' : 'default'}
                variant={filterType === filter.key ? 'filled' : 'outlined'}
                onClick={() => setFilterType(filter.key)}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': { boxShadow: theme.shadows[4] },
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
              }}
            >
              <Inventory2Icon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {formatNumber(stats.items)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active line items
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': { boxShadow: theme.shadows[4] },
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.12),
                color: theme.palette.success.main,
              }}
            >
              <CategoryIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {formatNumber(stats.categories)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categories represented
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': { boxShadow: theme.shadows[4] },
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{ bgcolor: alpha(theme.palette.info.main, 0.12), color: theme.palette.info.main }}
            >
              <LocalShippingIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {formatNumber(stats.lots)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lots with movement
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': { boxShadow: theme.shadows[4] },
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                color: theme.palette.warning.main,
              }}
            >
              <LayersIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {formatNumber(stats.onHand)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Units on hand (all)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
          <Box flex={1}>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <WarningAmberIcon color="warning" />
              <Typography variant="subtitle1" fontWeight={700}>
                Reorder watch
              </Typography>
              {stockLoading && <CircularProgress size={18} thickness={4} />}
            </Stack>
            {stockError && (
              <Typography variant="body2" color="error">
                Could not load reorder signals: {stockError.message}
              </Typography>
            )}
            {!stockLoading && !stockError && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    At or below MOQ / reorder
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {reorderBuckets.belowOrAt.length === 0 && (
                      <Chip size="small" label="All good" color="success" variant="outlined" />
                    )}
                    {reorderBuckets.belowOrAt.slice(0, 8).map(item => (
                      <Chip
                        key={item.ingredient_id}
                        label={`${item.ingredient_name} · ${formatNumber(item.current_stock)} ${item.unit}${item.reorder_point ? ` / ${formatNumber(item.reorder_point)}` : ''}`}
                        color="warning"
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                </Box>
                <Box flex={1}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Nearing threshold
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {reorderBuckets.nearing.length === 0 && (
                      <Chip size="small" label="None nearing" color="default" variant="outlined" />
                    )}
                    {reorderBuckets.nearing.slice(0, 8).map(item => (
                      <Chip
                        key={item.ingredient_id}
                        label={`${item.ingredient_name} · ${formatNumber(item.current_stock)} ${item.unit}${item.reorder_point ? ` / ${formatNumber(item.reorder_point)}` : ''}`}
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
          boxShadow: 'none',
        }}
      >
        <MaterialReactTable
          columns={columns}
          data={filteredInventory}
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
          muiTablePaperProps={{ sx: { boxShadow: 'none', borderRadius: 0 } }}
          muiTableHeadCellProps={{
            sx: {
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
              fontWeight: 700,
              borderColor: alpha(theme.palette.divider, 0.6),
            },
          }}
          muiTableBodyRowProps={({ row }) => ({
            onClick: () => {
              if (row.getIsGrouped()) {
                row.toggleExpanded();
              }
            },
            sx: {
              backgroundColor:
                row.index % 2 === 0
                  ? alpha(theme.palette.background.paper, 0.9)
                  : alpha(theme.palette.action.hover, 0.6),
              cursor: row.getIsGrouped() ? 'pointer' : 'default',
              transition: 'background-color 0.15s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
              },
            },
          })}
          muiTableBodyCellProps={{
            sx: {
              borderColor: alpha(theme.palette.divider, 0.5),
            },
          }}
          muiTopToolbarProps={{
            sx: {
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
          }}
          positionToolbarAlertBanner="none"
          displayColumnDefOptions={{
            'mrt-row-expand': {
              size: 0,
              enableResizing: false,
              Cell: () => null,
            },
          }}
        />
      </Paper>

      <PackagingPopper
        anchorEl={anchorEl}
        lots={selectedLots}
        batchRecipeId={batchRecipeId}
        onClose={handlePopperClose}
        onChipClick={handleChipClick}
        onAdjustLot={handleOpenAdjustDialog}
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

      {activeInventoryRow && (
        <LotAdjustDialog
          open={adjustDialogOpen}
          onClose={() => setAdjustDialogOpen(false)}
          inventoryId={activeInventoryRow.inventory_id}
          inventoryName={activeInventoryRow.ingredient_name}
          unit={activeInventoryRow.unit}
          inventoryQuantity={activeInventoryRow.quantity_on_hand}
          lots={activeInventoryRow.packaging_breakdown}
          defaultLotId={adjustLotId}
          loading={adjusting}
          onSubmit={handleAdjustSubmit}
        />
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
