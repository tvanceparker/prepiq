import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  Button,
  IconButton,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import InlineFieldDisplay from "../../utils/InlineFieldDisplay.jsx";
import SupplierDialog from "./components/SupplierDialog";
import IngredientDialog from "./components/IngredientDialog";
import {  GroupedIngredientsAccordion } from "./components/IngredientSupplierDetails.jsx";
import { useSupplierForm } from "./hooks/useSupplierForm";

const Supplier = () => {
  const {
    suppliers,
    loading,
    error,
    loadSuppliers,
    saveSupplier,
    addSupplier,
    saveIngredientSupplier,
    addIngredientSupplier,
  } = useSupplierForm();

  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [openIngredientDialog, setOpenIngredientDialog] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState({});
  const [editingIngredient, setEditingIngredient] = useState({});
  const [filterActive, setFilterActive] = useState(true);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = suppliers.filter(
    (s) => s.is_active === filterActive
  );

  const handleSupplierEdit = (supplier) => {
    setEditingSupplier({ ...supplier });
    setOpenSupplierDialog(true);
  };

  const handleIngredientEdit = (ingredient) => {
    setEditingIngredient({ ...ingredient });
    setOpenIngredientDialog(true);
    setSelectedSupplierId(ingredient.supplier_id || null);
  };

  const handleAddSupplier = () => {
    setEditingSupplier({
      name: "",
      type: "",
      region: "",
      contact_info: "",
      rating: 5,
      website: "",
      is_active: true,
      supplier_feedback: "",
      contract_status: "Active",
      contract_start_date: "",
      contract_end_date: "",
    });
    setOpenSupplierDialog(true);
  };

  const handleAddIngredient = (supplierId) => {
    setEditingIngredient({
      ingredient_id: "",
      unit: "",
      cost_per_unit: 0,
      lead_time_days: 0,
      spoilage_rate: 0,
      shelf_life_days: null,
      preferred: false,
      min_order_quantity: null,
      supplier_priority: null,
      pack_size: null,
      quantity_per_pack_item: null,
    });
    setSelectedSupplierId(supplierId);
    setOpenIngredientDialog(true);
  };

  const handleSaveSupplier = async () => {
    try {
      const result = editingSupplier.supplier_id
        ? await saveSupplier(editingSupplier)
        : await addSupplier(editingSupplier);
      if (result.success) {
        setOpenSupplierDialog(false);
        loadSuppliers();
        setSnackbar({
          open: true,
          message: "Supplier saved successfully.",
          severity: "success",
        });
      } else {
        throw new Error(result.message || "Failed to save supplier");
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  const handleSaveIngredient = async () => {
    try {
      const result = editingIngredient.ingredient_supplier_id
        ? await saveIngredientSupplier(editingIngredient)
        : await addIngredientSupplier(selectedSupplierId, editingIngredient);
      if (result.success) {
        setOpenIngredientDialog(false);
        loadSuppliers();
        setSnackbar({
          open: true,
          message: "Ingredient saved successfully.",
          severity: "success",
        });
      } else {
        throw new Error(result.message || "Failed to save ingredient");
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading)
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );

  return (
    <Box p={4}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4">Supplier List</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={filterActive}
                onChange={() => setFilterActive((prev) => !prev)}
                color="primary"
              />
            }
            label={filterActive ? "Active" : "Inactive"}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSupplier}
          >
            Add Supplier
          </Button>
        </Box>
      </Box>

      {filteredSuppliers.length === 0 ? (
        <Typography>No suppliers found for this filter.</Typography>
      ) : (
        filteredSuppliers.map((supplier) => (
          <Accordion key={supplier.supplier_id}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 0.5,
              }}
            >
              {/* Row: Supplier name + edit icon */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                width="100%"
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {supplier.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSupplierEdit(supplier);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Fields line below */}
              <Box width="100%">
                <InlineFieldDisplay
                  fields={[
                    { label: "Type", value: supplier.type },
                    { label: "Region", value: supplier.region },
                    { label: "Rating", value: supplier.rating },
                    { label: "Contact", value: supplier.contact_info },
                    {
                      label: "Website",
                      value: (
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "inherit",
                            textDecoration: "underline",
                            fontWeight: 500,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Link
                        </a>
                      ),
                    },
                  ]}
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <GroupedIngredientsAccordion
                ingredients={supplier.ingredients || []}
                onEdit={handleIngredientEdit}
              />
            </AccordionDetails>
          </Accordion>
        ))
      )}
      {/* Supplier Dialog */}
      <SupplierDialog
        open={openSupplierDialog}
        onClose={() => setOpenSupplierDialog(false)}
        supplier={editingSupplier}
        setSupplier={setEditingSupplier}
        onSave={handleSaveSupplier}
      />
      {/* Ingredient Dialog */}
      <IngredientDialog
        open={openIngredientDialog}
        onClose={() => setOpenIngredientDialog(false)}
        ingredient={editingIngredient}
        setIngredient={setEditingIngredient}
        onSave={handleSaveIngredient}
      />
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Supplier;
