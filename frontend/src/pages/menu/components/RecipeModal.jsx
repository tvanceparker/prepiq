import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  IconButton,
  Box,
  Autocomplete,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function RecipeModal({
  visible,
  formData,
  setFormData,
  onSave,
  onClose,
  onDelete,
  editingRecipe,
  onExited,
  allIngredients = [],
  allBatchRecipes = [],
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const combinedOptions = [
    ...allIngredients.map((i) => ({ name: i.name, type: "ingredient" })),
    ...allBatchRecipes.map((b) => ({ name: b.name, type: "batch" })),
  ];

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...(prev.ingredients || []),
        {
          name: "",
          quantity: "",
          unit: "",
          type: "ingredient",
          reference_id: "",
        },
      ],
    }));
  };

  const updateIngredient = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.ingredients || [])];

      if (field === "name") {
        const foundIngredient = allIngredients.find(
          (i) => i.name.toLowerCase() === value.toLowerCase()
        );
        const foundBatch = allBatchRecipes.find(
          (b) => b.name.toLowerCase() === value.toLowerCase()
        );

        if (foundIngredient) {
          updated[index] = {
            ...updated[index],
            name: foundIngredient.name,
            unit: foundIngredient.unit,
            type: "ingredient",
            reference_id: foundIngredient.ingredient_id,
          };
        } else if (foundBatch) {
          updated[index] = {
            ...updated[index],
            name: foundBatch.name,
            unit: foundBatch.yield_unit,
            type: "batch",
            reference_id: foundBatch.batch_recipe_id,
          };
        } else {
          updated[index] = { ...updated[index], name: value };
        }
      } else {
        updated[index][field] = value;
      }

      return { ...prev, ingredients: updated };
    });
  };

  const removeIngredient = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog
      open={visible}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      onExited={onExited}
    >
      <DialogTitle>
        {editingRecipe ? "Edit Recipe" : "Add New Recipe"}
      </DialogTitle>
      <DialogContent dividers>
        {/* Recipe Name */}
        <TextField
          label="Recipe Name"
          name="recipe_name"
          value={formData.recipe_name || ""}
          onChange={handleChange("recipe_name")}
          fullWidth
          margin="normal"
          required
        />

        {/* Instructions */}
        <TextField
          label="Instructions"
          name="instructions"
          value={formData.instructions || ""}
          onChange={handleChange("instructions")}
          fullWidth
          margin="normal"
          multiline
          rows={4}
        />

        {/* Ingredients List */}
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Ingredients
          </Typography>
          {(formData.ingredients || []).length === 0 && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No ingredients added.
            </Typography>
          )}

          {(formData.ingredients || []).map((ing, idx) => (
            <Box
              key={idx}
              display="grid"
              gridTemplateColumns="2fr 1fr 1fr auto"
              gap={1}
              alignItems="center"
              mb={2}
            >
              <Autocomplete
                freeSolo
                options={combinedOptions.map((opt) => opt.name)}
                value={ing.name || ""}
                onInputChange={(e, newVal) =>
                  updateIngredient(idx, "name", newVal)
                }
                renderInput={(params) => (
                  <TextField {...params} label="Ingredient Name" size="small" />
                )}
              />
              <TextField
                label="Quantity"
                size="small"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(idx, "quantity", e.target.value)
                }
              />
              <TextField
                label="Unit"
                size="small"
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
              />
              <IconButton
                aria-label={`Remove ingredient ${ing.name}`}
                color="error"
                onClick={() => removeIngredient(idx)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Button variant="contained" onClick={addIngredient} sx={{ mt: 1 }}>
            Add Ingredient
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        {editingRecipe && (
          <Button
            color="error"
            onClick={() => {
              if (!confirmDelete) setConfirmDelete(true);
              else onDelete();
            }}
          >
            {confirmDelete ? "Confirm Delete" : "Delete"}
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={!formData.recipe_name?.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
