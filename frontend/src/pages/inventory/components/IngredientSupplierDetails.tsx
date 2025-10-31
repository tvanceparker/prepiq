import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import type { IngredientSupplier } from '../../../interfaces/inventory';

// Ingredient details: full-width layout with spacing
export const IngredientDetails = ({ ingredient }: { ingredient: IngredientSupplier }) => {
  const fields = [
    { label: 'Ingredient ID', value: ingredient.ingredient_id },
    { label: 'Name', value: ingredient.ingredient_name },
    { label: 'Unit', value: ingredient.unit },
    {
      label: 'Cost Per Unit',
      value: `$${ingredient.cost_per_unit?.toFixed(2)}`,
    },
    { label: 'Lead Time (days)', value: ingredient.lead_time_days },
    { label: 'Spoilage Rate (%)', value: ingredient.spoilage_rate * 100 + '%' },
    { label: 'Shelf Life (days)', value: ingredient.shelf_life_days ?? 'N/A' },
    { label: 'Preferred', value: ingredient.preferred ? 'Yes' : 'No' },
    {
      label: 'Min Order Quantity',
      value: ingredient.min_order_quantity ?? 'N/A',
    },
    {
      label: 'Supplier Priority',
      value: ingredient.supplier_priority ?? 'N/A',
    },
    { label: 'Pack Size', value: ingredient.pack_size ?? 'N/A' },
    {
      label: 'Quantity Per Pack Item',
      value: ingredient.quantity_per_pack_item ?? 'N/A',
    },
  ];

  const mid = Math.ceil(fields.length / 2);
  const firstHalf = fields.slice(0, mid);
  const secondHalf = fields.slice(mid);

  const renderRow = items => (
    <Grid container spacing={2} sx={{ mb: 1 }}>
      {items.map(({ label, value }) => (
        <Grid item xs={12} sm={6} key={label}>
          <Box sx={{ pr: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
              {value}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ px: 1 }}>
      {renderRow(firstHalf)}
      {renderRow(secondHalf)}
    </Box>
  );
};

export const GroupedIngredientsAccordion = ({
  ingredients = [],
  onEdit,
}: {
  ingredients: IngredientSupplier[];
  onEdit: (ing: IngredientSupplier) => void;
}) => {
  if (ingredients.length === 0) {
    return <Typography>No ingredients supplied.</Typography>;
  }

  // Group ingredients by category or 'Uncategorized'
  const grouped = ingredients.reduce(
    (acc, ing) => {
      const category = ing.ingredient_category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(ing);
      return acc;
    },
    {} as Record<string, IngredientSupplier[]>
  );

  // Separate and remove uncategorized from group
  const uncategorized = grouped['Uncategorized'] || [];
  delete grouped['Uncategorized'];

  return (
    <>
      {/* Render Uncategorized ingredients directly */}
      {uncategorized.map(ingredient => (
        <Accordion
          key={ingredient.ingredient_supplier_id || ingredient.ingredient_id}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ flexGrow: 1 }}>
              {ingredient.ingredient_name} (ID: {ingredient.ingredient_id})
            </Typography>
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onEdit(ingredient);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </AccordionSummary>
          <AccordionDetails>
            <IngredientDetails ingredient={ingredient} />
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Render grouped ingredient categories */}
      {Object.entries(grouped).map(([category, items]) => (
        <Accordion key={category} defaultExpanded={false} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Chip label={category} color="primary" size="small" sx={{ mr: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold">
              {category} ({items.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {items.map(ingredient => (
              <Accordion
                key={ingredient.ingredient_supplier_id || ingredient.ingredient_id}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ flexGrow: 1 }}>
                    {ingredient.ingredient_name} (ID: {ingredient.ingredient_id})
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(ingredient);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </AccordionSummary>
                <AccordionDetails>
                  <IngredientDetails ingredient={ingredient} />
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
};
