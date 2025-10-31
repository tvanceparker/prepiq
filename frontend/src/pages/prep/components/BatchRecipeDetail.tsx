import React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Autocomplete,
  IconButton,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

export default function BatchRecipeDetail({
  recipeForm,
  setRecipeForm,
  ingredients,
  editMode,
  setEditMode,
  onUpdate,
}) {
  // Handlers for form and ingredients edits
  const handleFormChange = (field, value) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index, field, value) => {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredients];
      updated[index][field] = value;
      return { ...prev, ingredients: updated };
    });
  };

  const handleAddIngredient = () => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { ingredient_id: null, quantity_used: "", unit: "" },
      ],
    }));
  };

  const handleRemoveIngredient = (index) => {
    setRecipeForm((prev) => {
      const updated = [...prev.ingredients];
      updated.splice(index, 1);
      return { ...prev, ingredients: updated };
    });
  };

  if (!recipeForm || !recipeForm.name) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Select a recipe to view or edit
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">
          {recipeForm.name || "Selected Recipe"}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={editMode}
              onChange={(e) => setEditMode(e.target.checked)}
            />
          }
          label="Edit Mode"
        />
      </Box>
      <Divider sx={{ mb: 2 }} />

      {editMode ? (
        <>
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
                  value={recipeForm[field]}
                  onChange={(e) => handleFormChange(field, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Ingredients</Typography>

          {recipeForm.ingredients.map((ing, i) => (
            <Grid
              container
              spacing={2}
              key={i}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              {/* Ingredient name dropdown - bigger (6 columns) */}
              <Grid item xs={6} sx={{ minWidth: 250 }}>
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
                  sx={{ width: "100%" }}
                  renderInput={(params) => (
                    <TextField {...params} label="Ingredient" fullWidth />
                  )}
                  popupIcon={null}
                />
              </Grid>

              {/* Quantity input - smaller (2 columns) */}
              <Grid item xs={2}>
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

              {/* Unit dropdown - smaller (3 columns) */}
              <Grid item xs={3}>
                <Autocomplete
                  freeSolo
                  options={["kg", "g", "lbs", "oz", "liter", "ml", "count"]}
                  value={ing.unit}
                  onChange={(_, val) =>
                    handleIngredientChange(i, "unit", val || "")
                  }
                  onInputChange={(_, val) =>
                    handleIngredientChange(i, "unit", val)
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Unit" fullWidth />
                  )}
                />
              </Grid>

              {/* Delete button - 1 column */}
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

          <Box textAlign="right" mt={3}>
            <Button onClick={onUpdate} variant="contained">
              Update
            </Button>
          </Box>
        </>
      ) : (
        <>
          {/* Description */}
          <Box mb={3}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography
              variant="body1"
              fontWeight="medium"
              color="text.primary"
            >
              {recipeForm.description || "No description provided"}
            </Typography>
          </Box>

          {/* Yield, Prep Time, Shelf Life */}
          <Grid container spacing={3} mb={3}>
            {[
              {
                label: "Yield",
                value: `${recipeForm.yield_quantity} ${recipeForm.yield_unit}`,
              },
              {
                label: "Prep Time",
                value: `${recipeForm.estimated_prep_time_minutes} minutes`,
              },
              {
                label: "Shelf Life",
                value: `${recipeForm.shelf_life_days} days`,
              },
            ].map(({ label, value }, idx) => (
              <Grid item xs={12} sm={4} key={idx}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="medium"
                  color="text.primary"
                >
                  {value || "-"}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Ingredients List */}
          <Typography variant="subtitle1" gutterBottom>
            Ingredients
          </Typography>
          <Box component="ul" sx={{ pl: 3, m: 0 }}>
            {recipeForm.ingredients.map((ing, i) => {
              const found = ingredients.find(
                (x) => x.ingredient_id === ing.ingredient_id
              );
              return (
                <Box
                  component="li"
                  key={i}
                  sx={{
                    mb: 1,
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    color: "text.primary", // <- Uses theme-aware color
                    lineHeight: 1.3,
                  }}
                >
                  {found?.name || "Unknown"}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", fontWeight: "normal", mt: 0.5 }}
                  >
                    Qty: {ing.quantity_used} {ing.unit}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Paper>
  );
}
