import React from "react";
import {
  Paper,
  Typography,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Box,
} from "@mui/material";

export default function RecipeCard({ recipe, onEdit, expanded, onToggle }) {
  return (
    <Paper
      onClick={onToggle}
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        bgcolor: "background.paper",
        border: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) => theme.shadows[4],
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            component="h3"
            color="text.primary"
            sx={{ fontWeight: "bold" }}
          >
            {recipe.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {recipe.description}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(recipe);
          }}
        >
          Edit
        </Button>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {recipe.ingredients?.length > 0 ? (
          <List dense sx={{ pl: 2 }}>
            {recipe.ingredients.map((ing, i) => (
              <ListItem key={i} disablePadding>
                <ListItemText
                  primary={`${ing.quantity} ${ing.unit} ${ing.name}`}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      ({ing.type})
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic", pl: 2 }}
          >
            No ingredients listed.
          </Typography>
        )}
      </Collapse>
    </Paper>
  );
}
