import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Divider,
  Typography,
  Button,
  IconButton,
  Autocomplete,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

export default function BatchRecipeModal({
  open,
  onClose,
  ingredients,
  form,
  setForm,
  onCreate,
}) {
  // Form change handlers
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.ingredients];
      updated[index][field] = value;
      return { ...prev, ingredients: updated };
    });
  };

  const handleAddIngredient = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { ingredient_id: null, quantity_used: "", unit: "" },
      ],
    }));
  };

  const handleRemoveIngredient = (index) => {
    setForm((prev) => {
      const updated = [...prev.ingredients];
      updated.splice(index, 1);
      return { ...prev, ingredients: updated };
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Create New Batch Recipe</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {[
            ["name", "Name"],
            ["description", "Description"],
            ["yield_quantity", "Yield Quantity", "number"],
            ["yield_unit", "Yield Unit"],
            ["estimated_prep_time_minutes", "Prep (min)", "number"],
            ["shelf_life_days", "Shelf (days)", "number"],
          ].map(([field, label, type = "text"], idx) => (
            <Grid item xs={field.includes("yield") ? 4 : 6} key={idx}>
              <TextField
                label={label}
                fullWidth
                type={type}
                value={form[field]}
                onChange={(e) => handleFormChange(field, e.target.value)}
              />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">Ingredients</Typography>

        {form.ingredients.map((ing, i) => (
          <Grid
            container
            spacing={2}
            key={i}
            alignItems="center"
            sx={{ mt: 1 }}
          >
            <Grid item xs={5}>
              <Autocomplete
                options={ingredients}
                getOptionLabel={(opt) => opt.name}
                value={
                  ingredients.find(
                    (x) => x.ingredient_id === ing.ingredient_id
                  ) || null
                }
                onChange={(_, val) =>
                  handleIngredientChange(
                    i,
                    "ingredient_id",
                    val?.ingredient_id || null
                  )
                }
                renderInput={(params) => (
                  <TextField {...params} label="Ingredient" />
                )}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Qty"
                type="number"
                fullWidth
                value={ing.quantity_used}
                onChange={(e) =>
                  handleIngredientChange(i, "quantity_used", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Unit"
                fullWidth
                value={ing.unit}
                onChange={(e) =>
                  handleIngredientChange(i, "unit", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={1}>
              <IconButton onClick={() => handleRemoveIngredient(i)}>
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Button
          startIcon={<Add />}
          sx={{ mt: 2 }}
          onClick={handleAddIngredient}
          variant="outlined"
        >
          Add Ingredient
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onCreate}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
