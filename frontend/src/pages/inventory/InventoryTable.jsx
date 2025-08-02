import React, { useState, useMemo } from "react";
import { Box, Typography, Button, useTheme } from "@mui/material";
import { MaterialReactTable } from "material-react-table";
import { useInventoryTable } from "./hooks/useInventoryTable";
import PackagingPopper from "./components/PackagingPopper";
import ChipInfoPopper from "./components/ChipInfoPopper";
import InventoryIcon from "@mui/icons-material/Inventory2";

export default function InventoryTable() {
  const theme = useTheme(); // Access Emotion theme (via MUI)

  const { inventory, loading, error } = useInventoryTable();

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLots, setSelectedLots] = useState([]);
  const [batchRecipeId, setBatchRecipeId] = useState(null);

  const [chipAnchor, setChipAnchor] = useState(null);
  const [activeLotId, setActiveLotId] = useState(null);
  const [chipType, setChipType] = useState(null);

  const openChipPopper = Boolean(chipAnchor);

  const handleChipClick = (event, lotId, type) => {
    setChipAnchor(event.currentTarget);
    setActiveLotId(lotId);
    setChipType(type);
  };

  const handlePackagingClick = (event, breakdown, batchId) => {
    if (anchorEl) {
      setAnchorEl(null);
      setSelectedLots([]);
      setBatchRecipeId(null);
    } else {
      setAnchorEl(event.currentTarget);
      setSelectedLots(breakdown);
      setBatchRecipeId(batchId);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "ingredient_name",
        header: "Ingredient",
        size: 150,
        enableGrouping: true,
        Cell: ({ cell }) => {
          const name = cell.getValue();
          const isBatchRecipe = cell.row.original.batch_recipe_id !== null;
          return (
            <Typography
              variant="body1"
              sx={{ fontWeight: isBatchRecipe ? "bold" : "normal" }}
              color={isBatchRecipe ? "primary.main" : "text.primary"}
            >
              {name} {isBatchRecipe && "(Batch)"}
            </Typography>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 100,
        enableGrouping: true,
      },
      {
        accessorKey: "quantity_on_hand",
        header: "Quantity On Hand",
        size: 80,
        enableAggregation: true,
        aggregationFn: "sum",
        Cell: ({ cell }) => {
          if (cell.getIsGrouped()) {
            return <strong>{cell.getValue()}</strong>;
          }
          return (
            <Typography
              sx={{
                fontWeight: "bold",
                color:
                  cell.getValue() > 0
                    ? theme.palette.success.main
                    : theme.palette.error.main,
              }}
            >
              {cell.getValue()}
            </Typography>
          );
        },
      },
      {
        accessorKey: "unit",
        header: "Unit",
        size: 50,
      },
      {
        accessorKey: "packaging_breakdown",
        header: "Movements",
        size: 110,
        enableColumnFilter: false,
        Cell: ({ cell }) => {
          const row = cell.row.original;
          return (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<InventoryIcon />}
              onClick={(e) =>
                handlePackagingClick(e, cell.getValue(), row.batch_recipe_id)
              }
            >
              {cell.getValue()?.length || 0}
            </Button>
          );
        },
      },
    ],
    [anchorEl, theme.palette.error.main, theme.palette.success.main]
  );

  if (loading) return <Typography>Loading inventory...</Typography>;
  if (error)
    return <Typography color="error">Error: {error.message}</Typography>;

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
          density: "comfortable",
          columnVisibility: {},
          grouping: ["category"],
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
              row.index % 2 === 0
                ? theme.palette.background.paper
                : theme.palette.action.hover,
            cursor: row.getIsGrouped() ? "pointer" : "default",
          },
        })}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: theme.palette.action.selected,
            fontWeight: "bold",
          },
        }}
        displayColumnDefOptions={{
          "mrt-row-expand": {
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
