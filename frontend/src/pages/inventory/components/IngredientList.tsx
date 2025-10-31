import React, { useMemo } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import type { IngredientListProps, Ingredient } from '../../../interfaces/inventory';

export default function IngredientList({
  ingredients,
  filter,
  setFilter,
  onSelect,
  selectedId,
}: IngredientListProps) {
  // Filtered and grouped ingredients
  const grouped = useMemo(() => {
    const filtered = filter
      ? ingredients.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
      : ingredients;

    return filtered.reduce(
      (acc, ing) => {
        const category = ing.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(ing);
        return acc;
      },
      {} as Record<string, Ingredient[]>
    );
  }, [ingredients, filter]);

  const ingredientNames = useMemo(() => ingredients.map(i => i.name), [ingredients]);

  return (
    <Box
      p={2}
      borderRadius={2}
      boxShadow={1}
      bgcolor="background.paper"
      maxHeight={600}
      overflow="auto"
    >
      <Autocomplete
        freeSolo
        options={ingredientNames}
        value={filter}
        onInputChange={(_, value) => setFilter(value)}
        renderInput={params => (
          <TextField
            {...params}
            label="Search ingredients..."
            size="small"
            margin="normal"
            variant="outlined"
            fullWidth
          />
        )}
      />

      {ingredients.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
          No ingredients found
        </Typography>
      ) : (
        <List disablePadding>
          {Object.entries(grouped).map(([category, items]) => (
            <Box key={category}>
              <Typography
                variant="subtitle2"
                sx={{ px: 1.5, pt: 2, pb: 1, fontWeight: 'bold' }}
                color="text.secondary"
              >
                {category}
              </Typography>
              <Divider />
              {items.map(ingredient => (
                <ListItemButton
                  key={ingredient.ingredient_id}
                  selected={selectedId === ingredient.ingredient_id}
                  onClick={() => onSelect(ingredient)}
                  sx={{ py: 1 }}
                >
                  <ListItemText primary={ingredient.name} />
                </ListItemButton>
              ))}
            </Box>
          ))}
        </List>
      )}
    </Box>
  );
}
