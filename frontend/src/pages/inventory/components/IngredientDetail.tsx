import React, { useState, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SaveIcon from '@mui/icons-material/Save';

const COMMON_INGREDIENT_NAMES = [
  'Tomatoes',
  'Onions',
  'Garlic',
  'Olive Oil',
  'Butter',
  'Flour',
  'Sugar',
  'Salt',
  'Black Pepper',
  'Chicken Breast',
  'Beef',
  'Pork',
  'Fish',
  'Shrimp',
  'Basil',
  'Parsley',
  'Cilantro',
  'Cheddar',
  'Mozzarella',
  'Parmesan',
];

const COMMON_UNITS = ['lbs', 'oz', 'kg', 'g', 'each', 'case', 'bag', 'bunch'];

export default function IngredientDetail({
  ingredient,
  onSave,
  onDelete,
  hideEditToggle = false,
  forceEditable = false,
}) {
  const [localData, setLocalData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState(forceEditable);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setLocalData(ingredient ? { ...ingredient } : null);
    setEditable(forceEditable || false);
  }, [ingredient, forceEditable]);

  const handleChange = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (index, field, value) => {
    const suppliers = [...(localData?.suppliers || [])];
    suppliers[index] = { ...suppliers[index], [field]: value };
    setLocalData(prev => ({ ...prev, suppliers }));
  };

  const addSupplier = () => {
    setLocalData(prev => ({
      ...prev,
      suppliers: [
        ...(prev?.suppliers || []),
        {
          ingredient_supplier_id: null,
          supplier_id: null,
          supplier_name: '',
          cost_per_unit: '',
          unit: '',
          pack_size: '',
          quantity_per_pack_item: '',
          lead_time_days: '',
          preferred: false,
        },
      ],
    }));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await onSave(localData);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!localData?.ingredient_id || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(localData.ingredient_id);
    } finally {
      setSaving(false);
      setConfirmingDelete(false);
    }
  };

  const supplierCount = useMemo(() => (localData?.suppliers || []).length, [localData]);
  const preferredCount = useMemo(
    () => (localData?.suppliers || []).filter(supplier => supplier.preferred).length,
    [localData]
  );

  if (!localData) {
    return (
      <Box p={4} textAlign="center" color="text.secondary">
        Select an ingredient to view details
      </Box>
    );
  }

  return (
    <Box
      p={{ xs: 2, md: 3 }}
      bgcolor="transparent"
      borderRadius={2}
      maxHeight={760}
      overflow="auto"
    >
      <Paper
        sx={theme => ({
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.12),
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(
            theme.palette.background.paper,
            0.98
          )} 72%)`,
        })}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={theme => ({
                width: 52,
                height: 52,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              })}
            >
              <Inventory2OutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {localData.name || 'New Ingredient'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maintain category, unit, and supplier purchasing details in one editor.
              </Typography>
            </Box>
          </Stack>

          {!hideEditToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={editable}
                  onChange={() => setEditable(prev => !prev)}
                  color="primary"
                />
              }
              label={editable ? 'Editing enabled' : 'Preview mode'}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          <Chip
            label={`${supplierCount} supplier${supplierCount === 1 ? '' : 's'}`}
            color={supplierCount ? 'primary' : 'default'}
            size="small"
          />
          <Chip label={`${preferredCount} preferred`} size="small" variant="outlined" />
          <Chip label={localData.category || 'Uncategorized'} size="small" variant="outlined" />
          <Chip label={localData.unit || 'Unit not set'} size="small" variant="outlined" />
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          mb: 2.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={0.75} mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Core details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            These fields drive browseability and downstream purchasing context.
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={COMMON_INGREDIENT_NAMES}
              freeSolo
              value={localData.name || ''}
              onInputChange={(_, value) => handleChange('name', value)}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Ingredient name"
                  size="small"
                  disabled={!editable}
                  fullWidth
                />
              )}
              disabled={!editable}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Autocomplete
              options={COMMON_UNITS}
              freeSolo
              value={localData.unit || ''}
              onInputChange={(_, value) => handleChange('unit', value)}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Base unit"
                  size="small"
                  disabled={!editable}
                  fullWidth
                />
              )}
              disabled={!editable}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Category"
              fullWidth
              size="small"
              value={localData.category || ''}
              onChange={e => handleChange('category', e.target.value)}
              disabled={!editable}
            />
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <LocalShippingOutlinedIcon color="action" />
        <Typography variant="h6" fontWeight={700}>
          Supplier details
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Keep pricing, pack size, lead time, and preferred supplier logic readable enough for reorder
        and draft PO review.
      </Typography>

      {(localData.suppliers || []).map((supplier, i) => (
        <Accordion
          key={supplier.ingredient_supplier_id || i}
          disableGutters
          sx={{
            mb: 1.5,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, py: 0.5 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ md: 'center' }}
              sx={{ width: '100%' }}
            >
              <Typography sx={{ fontWeight: 700, flex: 1 }}>
                {supplier.supplier_name || `Supplier ${i + 1}`}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={supplier.preferred ? 'Preferred' : 'Standard'}
                  size="small"
                  color={supplier.preferred ? 'primary' : 'default'}
                />
                <Chip label={supplier.unit || 'No unit'} size="small" variant="outlined" />
                <Chip
                  label={
                    supplier.cost_per_unit ? `$${supplier.cost_per_unit}/unit` : 'Pricing pending'
                  }
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Supplier Name"
                  value={supplier.supplier_name}
                  fullWidth
                  size="small"
                  disabled
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Cost per Unit"
                  type="number"
                  inputProps={{ step: 0.01, min: 0, max: 99999 }}
                  value={supplier.cost_per_unit}
                  onChange={e => handleSupplierChange(i, 'cost_per_unit', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Unit"
                  value={supplier.unit}
                  onChange={e => handleSupplierChange(i, 'unit', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Pack Size"
                  type="number"
                  inputProps={{ min: 0, max: 99999 }}
                  value={supplier.pack_size}
                  onChange={e => handleSupplierChange(i, 'pack_size', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!editable}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Quantity per Pack Item"
                  type="number"
                  inputProps={{ min: 0, max: 99999 }}
                  value={supplier.quantity_per_pack_item}
                  onChange={e => handleSupplierChange(i, 'quantity_per_pack_item', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Lead Time (days)"
                  type="number"
                  inputProps={{ min: 0, max: 365 }}
                  value={supplier.lead_time_days}
                  onChange={e => handleSupplierChange(i, 'lead_time_days', e.target.value)}
                  fullWidth
                  size="small"
                  disabled={!editable}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={supplier.preferred || false}
                      onChange={e => handleSupplierChange(i, 'preferred', e.target.checked)}
                      disabled={!editable}
                    />
                  }
                  label="Preferred"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      <Box mt={2.5} display="flex" gap={1.5} flexWrap="wrap">
        <Button variant="outlined" color="primary" onClick={addSupplier} disabled={!editable}>
          Add Supplier Row
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          onClick={saveChanges}
          disabled={saving || !editable || !localData.name}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        {localData.ingredient_id && (
          <Button
            variant={confirmingDelete ? 'contained' : 'outlined'}
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={confirmingDelete ? handleDelete : () => setConfirmingDelete(true)}
            disabled={saving}
          >
            {confirmingDelete ? 'Confirm Delete' : 'Delete'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
