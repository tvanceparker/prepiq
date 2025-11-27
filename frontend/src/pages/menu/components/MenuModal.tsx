import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  Checkbox,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';

export default function MenuModal({
  visible,
  formData,
  setFormData,
  onSave,
  onClose,
  onDelete,
  onReactivate,
  isEditing,
  recipesList,
  availableCategories = [],
  handleRecipeToggle,
  editingItem,
  onExited,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isActive = editingItem?.is_active ?? true;

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    } else {
      onDelete();
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog open={visible} onClose={onClose} fullWidth maxWidth="sm" TransitionProps={{ onExited }}>
      <DialogTitle>{isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
          <TextField
            label="Name"
            name="menu_item_name"
            value={formData.menu_item_name}
            onChange={handleChange}
            placeholder="Enter menu item name"
            fullWidth
            margin="normal"
            required
          />

          <TextField
            label="Price"
            name="price"
            type="number"
            inputProps={{ step: '0.01' }}
            value={formData.price}
            onChange={handleChange}
            placeholder="Enter price"
            fullWidth
            margin="normal"
          />

          <Autocomplete
            freeSolo
            options={availableCategories}
            value={formData.category || ''}
            onChange={(event, newValue) => {
              setFormData(f => ({ ...f, category: newValue || '' }));
            }}
            onInputChange={(event, newInputValue) => {
              setFormData(f => ({ ...f, category: newInputValue || '' }));
            }}
            renderInput={params => (
              <TextField
                {...params}
                label="Category"
                placeholder="Enter or select category"
                fullWidth
                margin="normal"
                helperText={
                  formData.category && !availableCategories.includes(formData.category)
                    ? '✨ New category will be created'
                    : ''
                }
              />
            )}
          />

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              maxHeight: 200,
              overflowY: 'auto',
              mt: 3,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              {isEditing ? 'Linked Recipes' : 'Select Recipes'}
            </Typography>

            {recipesList.length === 0 ? (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No recipes available.
              </Typography>
            ) : (
              <List dense>
                {recipesList.map(recipe => (
                  <ListItem key={recipe.recipe_id} disablePadding>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.recipes.includes(recipe.recipe_id)}
                          onChange={() => handleRecipeToggle(recipe.recipe_id)}
                          color="primary"
                        />
                      }
                      label={recipe.recipe_name || recipe.name}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Reactivate button if inactive */}
          {isEditing && !isActive && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" color="primary" onClick={onReactivate}>
                Reactivate
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {isEditing && isActive && (
          <Button
            color={confirmDelete ? 'error' : 'inherit'}
            onClick={handleDeleteClick}
            variant={confirmDelete ? 'contained' : 'outlined'}
          >
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </Button>
        )}

        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={!formData.menu_item_name.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
