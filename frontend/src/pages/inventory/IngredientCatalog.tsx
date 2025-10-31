import React from "react";
import { Box, Typography, CircularProgress, Alert, Paper } from "@mui/material";
import useIngredientForm from "./hooks/useIngredientForm";
import IngredientList from "./components/IngredientList";
import IngredientDetail from "./components/IngredientDetail";

export default function IngredientCatalog() {
  const {
    ingredients,
    selectedIngredient,
    setSelectedIngredient,
    filter,
    setFilter,
    loading,
    error,
    saveIngredient,
  } = useIngredientForm();

  return (
    <Box
      sx={{
        maxWidth: "1400px", // slightly wider
        mx: "auto",
        p: 4,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 4,
        alignItems: "flex-start",
        minHeight: 600,
      }}
    >
      {/* Left Panel */}
      <Box
        sx={{
          flexBasis: { xs: "100%", md: "28%" },
          flexShrink: 0,
        }}
      >
        <Typography variant="h4" fontWeight="bold" mb={2}>
          Ingredient Catalog
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading ingredients...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <IngredientList
          ingredients={ingredients}
          filter={filter}
          setFilter={setFilter}
          onSelect={setSelectedIngredient}
          selectedId={selectedIngredient?.id}
        />
      </Box>

      {/* Right Panel */}
      <Paper
        elevation={1}
        sx={{
          flexGrow: 1,
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 3,
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.04)",
        }}
      >
        <IngredientDetail
          ingredient={selectedIngredient}
          onSave={saveIngredient}
        />
      </Paper>
    </Box>
  );
}
