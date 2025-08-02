import React from "react";
import {
  Paper,
  Typography,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

export default function MenuCard({ item, onEdit, expanded, onToggle }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        mb: 2,
        bgcolor: item.is_active
          ? "background.paper"
          : "action.disabledBackground",
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
      >
        <Box>
          <Typography variant="h6" color="primary" fontWeight="bold">
            {item.menu_item_name}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Price: ${item.price.toFixed(2)} | Category: {item.category}
          </Typography>
          {!item.is_active && (
            <Chip
              label="Inactive"
              color="error"
              size="small"
              sx={{ mt: 1, fontWeight: "bold" }}
            />
          )}
        </Box>
        <IconButton aria-label="edit" onClick={() => onEdit(item)}>
          <EditIcon color="primary" />
        </IconButton>
      </Box>

      {/* Toggle Recipes */}
      <Box onClick={onToggle} sx={{ cursor: "pointer", userSelect: "none" }}>
        <Box display="flex" alignItems="center" mb={1} gap={1}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            fontWeight="bold"
          >
            Recipes Used:
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {expanded ? "▼" : "►"}
          </Typography>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {item.recipes?.length > 0 ? (
            <List dense sx={{ pl: 2 }}>
              {item.recipes.map((recipe) => (
                <ListItem key={recipe.recipe_id} disablePadding>
                  <ListItemText
                    primary={recipe.recipe_name}
                    secondary={
                      <List dense sx={{ pl: 4 }}>
                        {recipe.ingredients.map((ing) => (
                          <ListItem key={ing.ingredient_id} disablePadding>
                            <ListItemText
                              primary={`${ing.ingredient_name}: ${ing.quantity} ${ing.unit}`}
                              primaryTypographyProps={{
                                variant: "body2",
                                color: "text.secondary",
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography
              variant="body2"
              fontStyle="italic"
              color="text.secondary"
              sx={{ pl: 2 }}
            >
              No recipes assigned.
            </Typography>
          )}
        </Collapse>
      </Box>
    </Paper>
  );
}
