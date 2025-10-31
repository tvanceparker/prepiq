import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function IngredientDetail({ ingredient, onSave }) {
  const [localData, setLocalData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState(false); // <-- toggle for all editing

  useEffect(() => {
    setLocalData(ingredient ? { ...ingredient } : null);
  }, [ingredient]);

  const handleChange = (field, value) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (index, field, value) => {
    const suppliers = [...(localData.suppliers || [])];
    suppliers[index] = { ...suppliers[index], [field]: value };
    setLocalData((prev) => ({ ...prev, suppliers }));
  };

  const addSupplier = () => {
    setLocalData((prev) => ({
      ...prev,
      suppliers: [
        ...(prev.suppliers || []),
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
    } catch (e) {
      // Handle errors as needed
    } finally {
      setSaving(false);
    }
  };

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
      {/* Sticky Header */}
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
        <Typography variant="h5" fontWeight="bold">
          {localData.name}
        </Typography>

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
      </Box>

      {/* Editable Fields */}
      <Box mb={3}>
        <TextField
          label="Ingredient Name"
          fullWidth
          size="small"
          margin="normal"
          value={localData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          disabled={!editable}
        />
        <TextField
          label="Unit"
          fullWidth
          size="small"
          margin="normal"
          value={localData.unit}
          onChange={(e) => handleChange("unit", e.target.value)}
          disabled={!editable}
        />
        <TextField
          label="Category"
          fullWidth
          size="small"
          margin="normal"
          value={localData.category}
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
            <Typography sx={{ fontWeight: "bold" }}>
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

      {/* Action Buttons */}
      <Box mt={2} display="flex" gap={2}>
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
          onClick={saveChanges}
          disabled={saving || !editable}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Box>
  );
}
