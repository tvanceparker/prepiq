import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress,
} from '@mui/material';
import useMenuForm from './hooks/useMenuForm';
import MenuCard from './components/MenuCard';
import MenuModal from './components/MenuModal';
import HintBox from './components/MenuHintBox';

export default function MenuBuilder() {
  const {
    menuItems,
    recipesList,
    categoriesList,
    formData,
    setFormData,
    editingItem,
    setEditingItem,
    handleSave,
    handleDelete,
    handleReactivate,
    handleRecipeToggle,
    loading,
    showInactive,
    setShowInactive,
    sortBy,
    setSortBy,
  } = useMenuForm();

  const [expandedId, setExpandedId] = useState(null);

  const handleModalClose = () => setEditingItem(null);

  const handleToggle = id => setExpandedId(prev => (prev === id ? null : id));

  const handleAddNew = () =>
    setEditingItem({
      menu_item_name: '',
      price: '',
      category: '',
      recipes: [],
    });

  return (
    <Box sx={{ px: 4, py: 6, maxWidth: '1440px', mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 6,
        }}
      >
        <Typography variant="h3" fontWeight="bold">
          Menu Builder
        </Typography>
        <Button
          variant="contained"
          color="success"
          onClick={handleAddNew}
          sx={{ px: 4, py: 1.5, boxShadow: 3 }}
        >
          + Add Menu Item
        </Button>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          mb: 6,
        }}
      >
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Show</InputLabel>
          <Select
            value={showInactive ? 'all' : 'active'}
            label="Show"
            onChange={e => setShowInactive(e.target.value === 'all')}
          >
            <MenuItem value="active">Active Only</MenuItem>
            <MenuItem value="all">All (Active + Inactive)</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            value={sortBy === 'abc' ? 'az' : 'category'}
            label="Sort"
            onChange={e => setSortBy(e.target.value === 'az' ? 'abc' : 'category')}
          >
            <MenuItem value="az">A-Z</MenuItem>
            <MenuItem value="category">By Category</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography mt={2}>Loading menu items...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3} mb={6}>
          {/* Smaller HintBox */}
          <Grid item xs={12} md={3}>
            <HintBox />
          </Grid>

          {/* MenuCards in 2-column grid */}
          <Grid item xs={12} md={9}>
            {menuItems.length === 0 ? (
              <Typography>No menu items found.</Typography>
            ) : (
              <Grid container spacing={3}>
                {menuItems.map(item => (
                  <Grid
                    key={item.menu_item_id}
                    item
                    xs={12}
                    sm={6} // 2 columns on small+ screens
                  >
                    <MenuCard
                      item={item}
                      onEdit={setEditingItem}
                      expanded={expandedId === item.menu_item_id}
                      onToggle={() => handleToggle(item.menu_item_id)}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      )}

      {/* Modal */}
      {editingItem && (
        <MenuModal
          visible={!!editingItem}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSave}
          onClose={handleModalClose}
          onDelete={handleDelete}
          onReactivate={handleReactivate}
          isEditing={!!editingItem}
          recipesList={recipesList}
          availableCategories={categoriesList}
          handleRecipeToggle={handleRecipeToggle}
          editingItem={editingItem}
          onExited={() => {}}
        />
      )}
    </Box>
  );
}
