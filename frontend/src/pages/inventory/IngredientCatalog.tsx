import React, { useMemo, useContext, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined';
import useIngredientForm from './hooks/useIngredientForm';
import IngredientList from './components/IngredientList';
import IngredientDetail from './components/IngredientDetail';
import { PageHeader } from '../../components/PageHeader';
import { AuthContext } from '../../contexts/AuthContext';

const statCardStyles = [
  { icon: <Inventory2OutlinedIcon color="primary" /> },
  { icon: <CategoryOutlinedIcon color="success" /> },
  { icon: <LocalShippingOutlinedIcon color="info" /> },
  { icon: <RuleFolderOutlinedIcon color="warning" /> },
];

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
  const isFull = tier === 'full';

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const newIngredientDraft = useMemo(
    () => ({ ingredient_id: null, name: '', unit: '', category: '', suppliers: [] }),
    []
  );

  const stats = useMemo(() => {
    const total = ingredients.length;
    const categories = new Set(ingredients.map(i => i.category).filter(Boolean)).size;
    const supplierLinks = ingredients.reduce((acc, ing) => acc + (ing.suppliers?.length || 0), 0);
    const covered = ingredients.filter(ing => (ing.suppliers?.length || 0) > 0).length;
    const coverage = total > 0 ? Math.round((covered / total) * 100) : 0;
    return { total, categories, supplierLinks, coverage, covered };
  }, [ingredients]);

  const statCards = [
    { label: 'Tracked ingredients', value: stats.total, helper: 'Catalog records in play' },
    { label: 'Categories', value: stats.categories, helper: 'Browseable groupings' },
    { label: 'Supplier links', value: stats.supplierLinks, helper: 'Purchasing relationships' },
    { label: 'Coverage', value: `${stats.coverage}%`, helper: `${stats.covered} with suppliers` },
  ];

  const closeNewDialog = () => setNewDialogOpen(false);

  const handleCreate = async (draft: any) => {
    const saved = await saveIngredient(draft);
    const payload = (saved as any)?.ingredient || draft;
    setSelectedIngredient(payload);
    closeNewDialog();
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
      <PageHeader title="Ingredient Catalog" />

      <Paper
        sx={theme => ({
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.12),
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.16)} 0%, ${alpha(
            theme.palette.success.light,
            0.12
          )} 50%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
          boxShadow: '0 22px 54px rgba(15, 23, 42, 0.08)',
        })}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Ingredient maintenance workspace
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.03em' }}>
                Keep the catalog clean before reorder and purchasing depend on it.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                Review category coverage, supplier links, and packaging data in one place. The left
                rail is for browsing; the main panel is for detail and editing.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => setNewDialogOpen(true)}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                Add Ingredient
              </Button>
              <Chip
                label={isFull ? 'Full workflow enabled' : 'Basic catalog mode'}
                color={isFull ? 'primary' : 'default'}
                variant={isFull ? 'filled' : 'outlined'}
                sx={{ height: 40, borderRadius: 999, fontWeight: 600 }}
              />
            </Stack>
          </Stack>

          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2">Refreshing ingredient data...</Typography>
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} lg={3} key={card.label}>
            <Paper
              sx={theme => ({
                p: 2.25,
                height: '100%',
                borderRadius: 3,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.7),
                backgroundColor: alpha(theme.palette.background.paper, 0.96),
                boxShadow: '0 10px 26px rgba(15, 23, 42, 0.05)',
              })}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.helper}
                  </Typography>
                </Box>
                <Box
                  sx={theme => ({
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: alpha(theme.palette.grey[200], 0.7),
                  })}
                >
                  {statCardStyles[index].icon}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} lg={4}>
          <Stack spacing={2.5}>
            <Paper
              sx={theme => ({
                p: 2.5,
                borderRadius: 3.5,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.7),
                boxShadow: '0 14px 34px rgba(15, 23, 42, 0.06)',
              })}
            >
              <Stack spacing={1.25} sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={800}>
                  Browse Ingredients
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use search to jump to a product, then edit supplier setup and packaging details in
                  the main panel.
                </Typography>
              </Stack>

              <IngredientList
                ingredients={ingredients}
                filter={filter}
                setFilter={setFilter}
                onSelect={setSelectedIngredient}
                selectedId={selectedIngredient?.ingredient_id || null}
              />
            </Paper>

            <Paper
              sx={theme => ({
                p: 2.5,
                borderRadius: 3.5,
                border: '1px solid',
                borderColor: alpha(theme.palette.info.main, 0.14),
                backgroundColor: alpha(theme.palette.info.light, 0.08),
              })}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Recommended next pass
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  After the supplier-optional purchasing contract, the highest-value UX work is the
                  supplier and catalog maintenance flow. Operators need a fast place to clean up
                  ingredient metadata before grouped draft ordering feels trustworthy.
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Paper
            sx={theme => ({
              p: { xs: 2.25, md: 3 },
              minHeight: 760,
              borderRadius: 3.5,
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.7),
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.96)} 0%, ${alpha(
                theme.palette.grey[50],
                0.86
              )} 100%)`,
              boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
            })}
          >
            {selectedIngredient ? (
              <IngredientDetail
                ingredient={selectedIngredient}
                onSave={saveIngredient}
                onDelete={removeIngredient}
              />
            ) : (
              <Stack
                alignItems="center"
                justifyContent="center"
                spacing={1.5}
                sx={{ minHeight: 620, textAlign: 'center', px: 3 }}
              >
                <Box
                  sx={theme => ({
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                  })}
                >
                  <Inventory2OutlinedIcon sx={{ fontSize: 34 }} />
                </Box>
                <Typography variant="h5" fontWeight={800}>
                  Select an ingredient to review details
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
                  Supplier pricing, pack sizes, lead times, and preferred ordering logic are all
                  maintained in the detail panel.
                </Typography>
              </Stack>
            )}
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
