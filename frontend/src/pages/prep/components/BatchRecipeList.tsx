import React from "react";
import { Box, Typography, Paper, Button, Divider } from "@mui/material";

export default function BatchRecipeList({
  recipes,
  selectedId,
  onSelect,
  onNew,
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2, height: "70vh", overflowY: "auto" }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Recipes</Typography>
          <Button onClick={onNew} variant="outlined">
            + New
          </Button>
        </Box>
        <Divider />
        {recipes.map((r) => (
          <Box
            key={r.batch_recipe_id}
            onClick={() => onSelect(r.batch_recipe_id)}
            sx={{
              p: 1,
              cursor: "pointer",
              bgcolor:
                r.batch_recipe_id === selectedId ? "#f0f0f0" : "transparent",
              borderBottom: "1px solid #eee",
            }}
          >
            <Typography variant="subtitle1">{r.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {r.description}
            </Typography>
            <Typography variant="caption">
              {r.yield_quantity} {r.yield_unit}
            </Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
