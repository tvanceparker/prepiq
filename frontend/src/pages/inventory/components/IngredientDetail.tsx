import React, { useState, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";

const COMMON_INGREDIENT_NAMES = [
  "Tomatoes",
  "Onions",
  "Garlic",
  "Olive Oil",
  "Butter",
  "Flour",
  "Sugar",
  "Salt",
  "Black Pepper",
  "Chicken Breast",
  "Beef",
  "Pork",
  "Fish",
  "Shrimp",
  "Basil",
  "Parsley",
  "Cilantro",
  "Cheddar",
  "Mozzarella",
  "Parmesan",
];

const COMMON_UNITS = ["lbs", "oz", "kg", "g", "each", "case", "bag", "bunch"];

export default function IngredientDetail({
  ingredient,
  onSave,
  onDelete,
  hideEditToggle = false,
  forceEditable = false,
}) {
  const [localData, setLocalData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState(forceEditable);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setLocalData(ingredient ? { ...ingredient } : null);
    setEditable(forceEditable || false);
  }, [ingredient, forceEditable]);

  const handleChange = (field, value) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (index, field, value) => {
    const suppliers = [...(localData?.suppliers || [])];
    suppliers[index] = { ...suppliers[index], [field]: value };
    setLocalData((prev) => ({ ...prev, suppliers }));
  };

  const addSupplier = () => {
    setLocalData((prev) => ({
      ...prev,
      suppliers: [
        ...(prev?.suppliers || []),
        {
          ingredient_supplier_id: null,
          supplier_id: null,
          supplier_name: "",
          cost_per_unit: "",
          unit: "",
          pack_size: "",
          quantity_per_pack_item: "",
          lead_time_days: "",
          preferred: false,
        },
      ],
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await onSave(localData);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!localData?.ingredient_id || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(localData.ingredient_id);
    } finally {
      setSaving(false);
      setConfirmingDelete(false);
    }
  };

  const supplierCount = useMemo(() => (localData?.suppliers || []).length, [localData]);

  if (!localData) {
    return (
      <Box p={4} textAlign="center" color="text.secondary">
        Select an ingredient to view details
      </Box>
    );
  }

  return (
    <Box
      p={3}
      bgcolor="background.paper"
      borderRadius={2}
      boxShadow={1}
      maxHeight={600}
      overflow="auto"
    >
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        bgcolor="background.paper"
        pb={1}
        mb={3}
        borderBottom={1}
        borderColor="divider"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {localData.name || "New Ingredient"}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip
              label={`Suppliers: ${supplierCount}`}
              size="small"
              color={supplierCount ? "primary" : "default"}
            />
            <Chip
              label={localData.category || "Uncategorized"}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Box>

        {!hideEditToggle && (
          <FormControlLabel
            control={
              <Switch
                checked={editable}
                onChange={() => setEditable((prev) => !prev)}
                color="primary"
              />
            }
            label="Edit Mode"
          />
        )}
      </Box>

      <Box mb={3}>
        <Autocomplete
          options={COMMON_INGREDIENT_NAMES}
          freeSolo
          value={localData.name || ""}
          onInputChange={(_, value) => handleChange("name", value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ingredient Name"
              size="small"
              margin="normal"
              disabled={!editable}
              fullWidth
            />
          )}
          disabled={!editable}
        />

        <Autocomplete
          options={COMMON_UNITS}
          freeSolo
          value={localData.unit || ""}
          onInputChange={(_, value) => handleChange("unit", value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Unit"
              size="small"
              margin="normal"
              disabled={!editable}
              fullWidth
            />
          )}
          disabled={!editable}
        />

        <TextField
          label="Category"
          fullWidth
          size="small"
          margin="normal"
          value={localData.category || ""}
          onChange={(e) => handleChange("category", e.target.value)}
          disabled={!editable}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        Suppliers
      </Typography>

      {(localData.suppliers || []).map((supplier, i) => (
        <Accordion key={supplier.ingredient_supplier_id || i}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 700 }}>
              {supplier.supplier_name || `Supplier ${i + 1}`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Supplier Name"
                  value={supplier.supplier_name}
                  fullWidth
                  size="small"
                  margin="normal"
                  disabled
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Cost per Unit"
                  type="number"
                  inputProps={{ step: 0.01, min: 0, max: 99999 }}
                  value={supplier.cost_per_unit}
                  onChange={(e) =>
                    handleSupplierChange(i, "cost_per_unit", e.target.value)
                  }
                  fullWidth
                  size="small"
                  margin="normal"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Unit"
                  value={supplier.unit}
                  onChange={(e) =>
                    handleSupplierChange(i, "unit", e.target.value)
                  }
                  fullWidth
                  size="small"
                  margin="normal"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Pack Size"
                  type="number"
                  inputProps={{ min: 0, max: 99999 }}
                  value={supplier.pack_size}
                  onChange={(e) =>
                    handleSupplierChange(i, "pack_size", e.target.value)
                  }
                  fullWidth
                  size="small"
                  margin="normal"
                  disabled={!editable}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Quantity per Pack Item"
                  type="number"
                  inputProps={{ min: 0, max: 99999 }}
                  value={supplier.quantity_per_pack_item}
                  onChange={(e) =>
                    handleSupplierChange(
                      i,
                      "quantity_per_pack_item",
                      e.target.value
                    )
                  }
                  fullWidth
                  size="small"
                  margin="normal"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Lead Time (days)"
                  type="number"
                  inputProps={{ min: 0, max: 365 }}
                  value={supplier.lead_time_days}
                  onChange={(e) =>
                    handleSupplierChange(i, "lead_time_days", e.target.value)
                  }
                  fullWidth
                  size="small"
                  margin="normal"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={supplier.preferred || false}
                      onChange={(e) =>
                        handleSupplierChange(i, "preferred", e.target.checked)
                      }
                      disabled={!editable}
                    />
                  }
                  label="Preferred"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      <Box mt={2} display="flex" gap={2} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          onClick={addSupplier}
          disabled={!editable}
        >
          + Add Supplier
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={saveChanges}
          disabled={saving || !editable || !localData.name}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        {localData.ingredient_id && (
          <Button
            variant={confirmingDelete ? "contained" : "outlined"}
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={confirmingDelete ? handleDelete : () => setConfirmingDelete(true)}
            disabled={saving}
          >
            {confirmingDelete ? "Confirm Delete" : "Delete"}
          </Button>
        )}
      </Box>
    </Box>
  );
}
