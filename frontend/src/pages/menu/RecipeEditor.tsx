import React, { useState } from "react";
import { Box, Typography, Button, Grid, CircularProgress } from "@mui/material";
import useRecipeForm from "./hooks/useRecipeForm";
import RecipeCard from "./components/RecipeCard";
import RecipeModal from "./components/RecipeModal";

export default function RecipeEditor() {
  const {
    recipes,
    formData,
    setFormData,
    editingRecipe,
    setEditingRecipe,
    handleSave,
    handleDelete,
    loading,
    allIngredients,
    allBatchRecipes,
  } = useRecipeForm();

  const [expandedId, setExpandedId] = useState(null);

  const handleModalClose = () => setEditingRecipe(null);

  const openModal = (recipe = null) => {
    setEditingRecipe(
      recipe || {
        recipe_name: "",
        instructions: "",
        ingredients: [],
      }
    );
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Box sx={{ px: 4, py: 6, maxWidth: "1120px", mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 6,
        }}
      >
        <Typography variant="h3" fontWeight="bold">
          Recipe Editor
        </Typography>
        <Button
          variant="contained"
          color="success"
          onClick={() => openModal()}
          sx={{ px: 4, py: 1.5, boxShadow: 3 }}
        >
          + Add New Recipe
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
          <Typography mt={2}>Loading recipes...</Typography>
        </Box>
      ) : recipes.length === 0 ? (
        <Typography>No recipes found.</Typography>
      ) : (
        <Grid container spacing={3}>
          {recipes.map((recipe) => (
            <Grid item xs={12} sm={6} key={recipe.recipe_id}>
              <RecipeCard
                recipe={recipe}
                expanded={expandedId === recipe.recipe_id}
                onToggle={() => toggleExpand(recipe.recipe_id)}
                onEdit={openModal}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {editingRecipe && (
        <RecipeModal
          visible={!!editingRecipe}
          formData={formData}
          setFormData={setFormData}
          onSave={() => {
            handleSave();
            handleModalClose();
          }}
          onClose={handleModalClose}
          onDelete={() => {
            handleDelete();
            handleModalClose();
          }}
          editingRecipe={editingRecipe}
          onExited={() => {}}
          allIngredients={allIngredients}
          allBatchRecipes={allBatchRecipes}
        />
      )}
    </Box>
  );
}
