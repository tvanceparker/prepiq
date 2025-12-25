import React, { useMemo, useContext, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import useIngredientForm from './hooks/useIngredientForm';
import IngredientList from './components/IngredientList';
import IngredientDetail from './components/IngredientDetail';
import { PageHeader } from '../../components/PageHeader';
import { AuthContext } from '../../contexts/AuthContext';

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
    removeIngredient,
  } = useIngredientForm();

  const { tier } = useContext(AuthContext);
  const isPro = tier === 'pro' || tier === 'master';

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const newIngredientDraft = useMemo(
    () => ({ ingredient_id: null, name: '', unit: '', category: '', suppliers: [] }),
    []
  );

  const stats = useMemo(() => {
    const total = ingredients.length;
    const categories = new Set(ingredients.map(i => i.category).filter(Boolean));
    const suppliers = ingredients.reduce((acc, ing) => acc + (ing.suppliers?.length || 0), 0);
    return { total, categories: categories.size, suppliers };
  }, [ingredients]);

  const renderHeader = () => (
    <Box mb={isPro ? 3 : 2}>
      <PageHeader title="Ingredient Catalog" />
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography>Loading ingredients...</Typography>
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const renderStats = () => (
    <Grid container spacing={2} mb={2}>
      {[
        {
          label: 'Active Ingredients',
          value: stats.total,
          icon: <Inventory2OutlinedIcon color="primary" />, // simple accent
        },
        {
          label: 'Categories',
          value: stats.categories,
          icon: <LocalShippingOutlinedIcon color="success" />, // reused icon for variety
        },
        {
          label: 'Supplier Links',
          value: stats.suppliers,
          icon: <LocalShippingOutlinedIcon color="info" />,
        },
      ].map(card => (
        <Grid item xs={12} md={4} key={card.label}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0px 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            {card.icon}
            <Box>
              <Typography variant="overline" color="text.secondary">
                {card.label}
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {card.value}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  const openNewDialog = () => setNewDialogOpen(true);
  const closeNewDialog = () => setNewDialogOpen(false);

  const handleCreate = async (draft: any) => {
    const saved = await saveIngredient(draft);
    const payload = (saved as any)?.ingredient || draft;
    setSelectedIngredient(payload);
    closeNewDialog();
  };

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto', p: 4 }}>
      {renderHeader()}

      {isPro && renderStats()}

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: isPro ? '0px 10px 30px rgba(0,0,0,0.08)' : '0px 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6" fontWeight={700}>
                Browse Ingredients
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={openNewDialog}
              >
                New
              </Button>
            </Stack>

            <IngredientList
              ingredients={ingredients}
              filter={filter}
              setFilter={setFilter}
              onSelect={setSelectedIngredient}
              selectedId={selectedIngredient?.ingredient_id || null}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            elevation={isPro ? 3 : 1}
            sx={{
              flexGrow: 1,
              bgcolor: 'background.paper',
              borderRadius: 3,
              p: { xs: 2.5, md: 3 },
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: isPro ? '0px 12px 36px rgba(0,0,0,0.08)' : '0px 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <IngredientDetail
              ingredient={selectedIngredient}
              onSave={saveIngredient}
              onDelete={removeIngredient}
            />
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={newDialogOpen} onClose={closeNewDialog} fullWidth maxWidth="md">
        <DialogTitle>New Ingredient</DialogTitle>
        <DialogContent>
          <IngredientDetail
            ingredient={newIngredientDraft}
            onSave={handleCreate}
            onDelete={null}
            hideEditToggle
            forceEditable
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNewDialog} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
