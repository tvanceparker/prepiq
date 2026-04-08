import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import SupplierDialog from './components/SupplierDialog';
import IngredientDialog from './components/IngredientDialog';
import { GroupedIngredientsAccordion } from './components/IngredientSupplierDetails';
import { useSupplierForm } from './hooks/useSupplierForm';

const Supplier = () => {
  const {
    suppliers,
    loading,
    error,
    loadSuppliers,
    saveSupplier,
    addSupplier,
    saveIngredientSupplier,
    addIngredientSupplier,
  } = useSupplierForm();

  const [openSupplierDialog, setOpenSupplierDialog] = useState(false);
  const [openIngredientDialog, setOpenIngredientDialog] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [filterActive, setFilterActive] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return suppliers.filter(supplier => {
      if (supplier.is_active !== filterActive) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [supplier.name, supplier.type, supplier.region, supplier.contact_info]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });
  }, [filterActive, searchValue, suppliers]);

  const stats = useMemo(() => {
    const activeCount = suppliers.filter(supplier => supplier.is_active).length;
    const inactiveCount = suppliers.length - activeCount;
    const linkedIngredients = suppliers.reduce(
      (sum, supplier) => sum + (supplier.ingredients?.length || 0),
      0
    );
    const avgRating =
      suppliers.length > 0
        ? (
            suppliers.reduce((sum, supplier) => sum + Number(supplier.rating || 0), 0) /
            suppliers.length
          ).toFixed(1)
        : '0.0';

    return { activeCount, inactiveCount, linkedIngredients, avgRating };
  }, [suppliers]);

  const handleSupplierEdit = supplier => {
    setEditingSupplier({ ...supplier });
    setOpenSupplierDialog(true);
  };

  const handleIngredientEdit = ingredient => {
    setEditingIngredient({ ...ingredient });
    setOpenIngredientDialog(true);
    setSelectedSupplierId(ingredient.supplier_id || null);
  };

  const handleAddSupplier = () => {
    setEditingSupplier({
      name: '',
      type: '',
      region: '',
      contact_info: '',
      rating: 5,
      website: '',
      is_active: true,
      supplier_feedback: '',
      contract_status: 'Active',
      contract_start_date: '',
      contract_end_date: '',
    });
    setOpenSupplierDialog(true);
  };

  // TODO: Implement Add Ingredient functionality
  // const handleAddIngredient = supplierId => {
  //   setEditingIngredient({
  //     ingredient_id: '',
  //     unit: '',
  //     cost_per_unit: 0,
  //     lead_time_days: 0,
  //     spoilage_rate: 0,
  //     shelf_life_days: null,
  //     preferred: false,
  //     min_order_quantity: null,
  //     supplier_priority: null,
  //     pack_size: null,
  //     quantity_per_pack_item: null,
  //   });
  //   setSelectedSupplierId(supplierId);
  //   setOpenIngredientDialog(true);
  // };

  const handleSaveSupplier = async () => {
    try {
      const result = editingSupplier.supplier_id
        ? await saveSupplier(editingSupplier)
        : await addSupplier(editingSupplier);
      if (result.success) {
        setOpenSupplierDialog(false);
        loadSuppliers();
        setSnackbar({
          open: true,
          message: 'Supplier saved successfully.',
          severity: 'success',
        });
      } else {
        throw new Error(result.message || 'Failed to save supplier');
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleSaveIngredient = async () => {
    try {
      const result = editingIngredient.ingredient_supplier_id
        ? await saveIngredientSupplier(editingIngredient)
        : await addIngredientSupplier(selectedSupplierId, editingIngredient);
      if (result.success) {
        setOpenIngredientDialog(false);
        loadSuppliers();
        setSnackbar({
          open: true,
          message: 'Ingredient saved successfully.',
          severity: 'success',
        });
      } else {
        throw new Error(result.message || 'Failed to save ingredient');
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading && suppliers.length === 0)
    return (
      <Box p={6} display="flex" flexDirection="column" justifyContent="center" alignItems="center">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Loading suppliers...
        </Typography>
      </Box>
    );

  if (error)
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
      <Paper
        sx={theme => ({
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: alpha(theme.palette.success.main, 0.14),
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.16)} 0%, ${alpha(
            theme.palette.info.light,
            0.12
          )} 52%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
          boxShadow: '0 22px 54px rgba(15, 23, 42, 0.08)',
        })}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            justifyContent="space-between"
            spacing={2}
            alignItems={{ xs: 'flex-start', lg: 'center' }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Supplier maintenance workspace
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.03em' }}>
                Manage suppliers and purchasing metadata without hunting through legacy forms.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 780 }}>
                Search suppliers, review linked ingredients, and update contract or packaging
                details from a single, calmer screen.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={filterActive}
                    onChange={() => setFilterActive(prev => !prev)}
                    color="primary"
                  />
                }
                label={filterActive ? 'Showing active suppliers' : 'Showing inactive suppliers'}
                sx={{ mr: 0 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddSupplier}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                Add Supplier
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            placeholder="Search supplier name, type, region, or contact"
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon fontSize="small" style={{ marginRight: 8, opacity: 0.6 }} />
              ),
            }}
            sx={{
              maxWidth: 460,
              '& .MuiOutlinedInput-root': {
                borderRadius: 999,
                backgroundColor: 'background.paper',
              },
            }}
          />
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Active suppliers',
            value: stats.activeCount,
            helper: `${stats.inactiveCount} inactive`,
            icon: <LocalShippingOutlinedIcon color="primary" />,
          },
          {
            label: 'Linked ingredients',
            value: stats.linkedIngredients,
            helper: 'Purchasing rows attached',
            icon: <Inventory2OutlinedIcon color="success" />,
          },
          {
            label: 'Average rating',
            value: stats.avgRating,
            helper: 'Across supplier records',
            icon: <StarOutlineIcon color="warning" />,
          },
        ].map(item => (
          <Paper
            key={item.label}
            sx={{
              flex: 1,
              p: 2.25,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 10px 26px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.helper}
                </Typography>
              </Box>
              <Box
                sx={theme => ({
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: alpha(theme.palette.grey[200], 0.72),
                })}
              >
                {item.icon}
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {filteredSuppliers.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            borderRadius: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            No suppliers match this view
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Try a different search term, switch active status, or add a new supplier record.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddSupplier}>
            Add Supplier
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {filteredSuppliers.map(supplier => {
            const ingredientCount = supplier.ingredients?.length || 0;

            return (
              <Card
                key={supplier.supplier_id}
                sx={{
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 14px 34px rgba(15, 23, 42, 0.05)',
                  overflow: 'hidden',
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.75 } }}>
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Stack spacing={1.25} sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="h5" fontWeight={800}>
                            {supplier.name}
                          </Typography>
                          <Chip
                            label={supplier.is_active ? 'Active' : 'Inactive'}
                            color={supplier.is_active ? 'success' : 'default'}
                            size="small"
                          />
                          {supplier.contract_status && (
                            <Chip
                              label={supplier.contract_status}
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {supplier.type && <Chip label={supplier.type} size="small" />}
                          {supplier.region && (
                            <Chip label={supplier.region} size="small" variant="outlined" />
                          )}
                          <Chip
                            label={`${ingredientCount} linked ingredient${ingredientCount === 1 ? '' : 's'}`}
                            size="small"
                            color={ingredientCount > 0 ? 'primary' : 'default'}
                            variant={ingredientCount > 0 ? 'filled' : 'outlined'}
                          />
                          {supplier.rating != null && (
                            <Chip
                              icon={<StarOutlineIcon fontSize="small" />}
                              label={Number(supplier.rating).toFixed(1)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
                          {supplier.contact_info && (
                            <Typography variant="body2" color="text.secondary">
                              Contact: {supplier.contact_info}
                            </Typography>
                          )}
                          {supplier.website && (
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <PublicOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography
                                component="a"
                                href={supplier.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                                sx={{ color: 'primary.main', textDecoration: 'none' }}
                              >
                                Visit website
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <IconButton onClick={() => handleSupplierEdit(supplier)}>
                          <EditIcon />
                        </IconButton>
                      </Stack>
                    </Stack>

                    {supplier.supplier_feedback && (
                      <Paper
                        variant="outlined"
                        sx={theme => ({
                          p: 1.5,
                          borderRadius: 2.5,
                          backgroundColor: alpha(theme.palette.warning.light, 0.08),
                          borderColor: alpha(theme.palette.warning.main, 0.16),
                        })}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {supplier.supplier_feedback}
                        </Typography>
                      </Paper>
                    )}

                    <Divider />

                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.25 }}>
                        Ingredient relationships
                      </Typography>
                      <GroupedIngredientsAccordion
                        ingredients={supplier.ingredients || []}
                        onEdit={handleIngredientEdit}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
      {/* Supplier Dialog */}
      <SupplierDialog
        open={openSupplierDialog}
        onClose={() => setOpenSupplierDialog(false)}
        supplier={editingSupplier}
        setSupplier={setEditingSupplier}
        onSave={handleSaveSupplier}
      />
      {/* Ingredient Dialog */}
      <IngredientDialog
        open={openIngredientDialog}
        onClose={() => setOpenIngredientDialog(false)}
        ingredient={editingIngredient}
        setIngredient={setEditingIngredient}
        onSave={handleSaveIngredient}
      />
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Supplier;
