import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Chip,
  IconButton,
  Checkbox,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Fade,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { POSuggestionsResponse, POSuggestionGroup } from '../../../../interfaces/inventory';

const formatValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const formatSelectionRule = (rule?: string) => {
  if (rule === 'preferred_lowest_priority') {
    return 'preferred supplier rule';
  }
  if (rule === 'fallback_lowest_priority') {
    return 'fallback to lowest supplier priority';
  }
  return rule || 'supplier rule';
};

const getForecastSourceLabel = (suggestions: POSuggestionsResponse) =>
  suggestions.forecast_source_type === 'eod' ? 'EOD' : 'On-demand';

const getSupplierGroupKey = (supplierId?: number | null) =>
  supplierId === null || supplierId === undefined ? 'unspecified' : String(supplierId);

const getSupplierLabel = (supplierName?: string | null, supplierId?: number | null) => {
  if (supplierName) {
    return supplierName;
  }
  if (supplierId === null || supplierId === undefined) {
    return 'Unspecified supplier';
  }
  return `Supplier ${supplierId}`;
};

const formatForecastGeneratedAt = (value: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString();
};

const formatConfidence = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return `${Math.round(value * 100)}% confidence`;
};

const getAssumptionWarnings = (item: POSuggestionsResponse['all_items'][number]) => {
  const flags = item.explanation?.assumption_flags;
  if (!flags) {
    return [] as string[];
  }

  const warnings: string[] = [];
  if (flags.lead_time_source !== 'supplier') {
    warnings.push('lead time fallback');
  }
  if (flags.moq_source !== 'supplier') {
    warnings.push('MOQ fallback');
  }
  if (flags.shelf_life_source === 'missing_assumed_zero') {
    warnings.push('shelf life assumed 0');
  }
  if (flags.inventory_source !== 'inventory_summary') {
    warnings.push('inventory fallback');
  }
  if (flags.unit_conversion_fallback) {
    warnings.push('unit conversion fallback');
  }
  if (flags.pricing_missing) {
    warnings.push('pricing missing');
  }
  if (flags.abc_defaulted) {
    warnings.push('ABC defaulted to C');
  }
  return warnings;
};

interface POSupplierReviewProps {
  suggestions: POSuggestionsResponse;
  selectedItems: Map<string, number>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  expandedSuppliers: Set<string>;
  setExpandedSuppliers: React.Dispatch<React.SetStateAction<Set<string>>>;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  showSummary?: boolean;
  showNotes?: boolean;
  title?: string;
  maxHeight?: number;
}

export default function POSupplierReview({
  suggestions,
  selectedItems,
  setSelectedItems,
  expandedSuppliers,
  setExpandedSuppliers,
  orderNotes,
  setOrderNotes,
  showSummary = true,
  showNotes = true,
  title = 'Review & Finalize Orders',
  maxHeight = 350,
}: POSupplierReviewProps) {
  // Update item quantity
  const updateItemQty = (key: string, delta: number) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      const current = next.get(key) || 0;
      const newQty = Math.max(1, current + delta);
      next.set(key, newQty);
      return next;
    });
  };

  // Toggle item selection
  const toggleItemSelection = (
    supplierId: number | null | undefined,
    ingredientId: number,
    suggestedQty: number
  ) => {
    const key = `${getSupplierGroupKey(supplierId)}-${ingredientId}`;
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, suggestedQty);
      }
      return next;
    });
  };

  // Toggle supplier expansion
  const toggleSupplierExpand = (supplierId: number | null | undefined) => {
    const groupKey = getSupplierGroupKey(supplierId);
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Toggle all supplier items
  const toggleSupplierItems = (supplier: POSuggestionGroup) => {
    const supplierKeys = supplier.items.map(i => ({
      key: `${getSupplierGroupKey(supplier.supplier_id)}-${i.ingredient_id}`,
      qty: i.quantity_to_order,
    }));
    const allSelected = supplierKeys.every(k => selectedItems.has(k.key));

    setSelectedItems(prev => {
      const next = new Map(prev);
      if (allSelected) {
        supplierKeys.forEach(k => next.delete(k.key));
      } else {
        supplierKeys.forEach(k => next.set(k.key, k.qty));
      }
      return next;
    });
  };

  // Calculate totals
  const reviewTotals = useMemo(() => {
    let total = 0;
    let itemCount = 0;
    const supplierSet = new Set<string>();

    suggestions.all_items.forEach(item => {
      const key = `${getSupplierGroupKey(item.supplier_id)}-${item.ingredient_id}`;
      if (selectedItems.has(key)) {
        const qty = selectedItems.get(key) || item.quantity_to_order;
        total += qty * item.unit_price;
        itemCount++;
        supplierSet.add(getSupplierGroupKey(item.supplier_id));
      }
    });

    return { itemCount, total, supplierCount: supplierSet.size };
  }, [suggestions, selectedItems]);

  const supplierBuckets = useMemo(
    () =>
      suggestions.suggestions.map(supplier => {
        const supplierGroupKey = getSupplierGroupKey(supplier.supplier_id);
        const selectedCount = supplier.items.filter(item =>
          selectedItems.has(`${supplierGroupKey}-${item.ingredient_id}`)
        ).length;

        return {
          key: supplierGroupKey,
          label: getSupplierLabel(supplier.supplier_name, supplier.supplier_id),
          selectedCount,
          totalCount: supplier.items.length,
          unspecified: supplier.supplier_id === null || supplier.supplier_id === undefined,
        };
      }),
    [selectedItems, suggestions.suggestions]
  );

  return (
    <Fade in timeout={300}>
      <Box>
        <Paper
          variant="outlined"
          sx={theme => ({
            p: 2.5,
            mb: 2,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, ${alpha(
              theme.palette.background.paper,
              0.98
            )} 75%)`,
          })}
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review one grouped purchasing session, then create a separate draft order for each
              supplier bucket.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                label={`${getForecastSourceLabel(suggestions)} forecast`}
                color={suggestions.forecast_status === 'ready' ? 'primary' : 'warning'}
                variant="outlined"
                size="small"
              />
              {suggestions.forecast_status !== 'ready' && (
                <Chip
                  label={suggestions.forecast_status}
                  color={suggestions.forecast_status === 'failed' ? 'error' : 'warning'}
                  variant="filled"
                  size="small"
                />
              )}
            </Stack>
            {(suggestions.forecast_generated_at || suggestions.forecast_status_message) && (
              <Box>
                {suggestions.forecast_generated_at && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {suggestions.forecast_reused ? 'Reused' : 'Generated'}{' '}
                    {getForecastSourceLabel(suggestions)} forecast on{' '}
                    {formatForecastGeneratedAt(suggestions.forecast_generated_at)}
                  </Typography>
                )}
                {(suggestions.forecast_version ||
                  suggestions.forecast_confidence_score !== undefined) && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {suggestions.forecast_version
                      ? `Version ${suggestions.forecast_version}`
                      : 'Version n/a'}
                    {formatConfidence(suggestions.forecast_confidence_score)
                      ? ` · ${formatConfidence(suggestions.forecast_confidence_score)}`
                      : ''}
                  </Typography>
                )}
                {suggestions.forecast_status_message && (
                  <Typography variant="caption" color="warning.main" display="block">
                    {suggestions.forecast_status_message}
                  </Typography>
                )}
              </Box>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {supplierBuckets.map(bucket => (
                <Chip
                  key={bucket.key}
                  label={`${bucket.label}: ${bucket.selectedCount}/${bucket.totalCount}`}
                  size="small"
                  color={
                    bucket.unspecified ? 'warning' : bucket.selectedCount ? 'primary' : 'default'
                  }
                  variant={bucket.selectedCount ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Stack>
        </Paper>

        {showSummary && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }} variant="outlined">
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Items Selected
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reviewTotals.itemCount}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Suppliers
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reviewTotals.supplierCount}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Cost
                </Typography>
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  ${reviewTotals.total.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        <Box sx={{ maxHeight, overflow: 'auto' }}>
          <List disablePadding>
            {suggestions.suggestions.map(supplier => {
              const supplierGroupKey = getSupplierGroupKey(supplier.supplier_id);
              const supplierKeys = supplier.items.map(i => ({
                key: `${supplierGroupKey}-${i.ingredient_id}`,
                qty: i.quantity_to_order,
              }));
              const allSelected = supplierKeys.every(k => selectedItems.has(k.key));
              const someSelected = supplierKeys.some(k => selectedItems.has(k.key));
              const supplierTotal = supplier.items.reduce((sum, item) => {
                const key = `${supplierGroupKey}-${item.ingredient_id}`;
                if (selectedItems.has(key)) {
                  return sum + (selectedItems.get(key) || item.quantity_to_order) * item.unit_price;
                }
                return sum;
              }, 0);

              return (
                <Paper
                  key={supplierGroupKey}
                  variant="outlined"
                  sx={{ mb: 1.5, borderRadius: 3, overflow: 'hidden' }}
                >
                  <ListItemButton
                    onClick={() => toggleSupplierExpand(supplier.supplier_id)}
                    sx={{ bgcolor: 'background.paper', px: 2, py: 1.25 }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onClick={e => {
                          e.stopPropagation();
                          toggleSupplierItems(supplier);
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography fontWeight={700}>
                          {getSupplierLabel(supplier.supplier_name, supplier.supplier_id)}
                        </Typography>
                      }
                      secondary={`${supplier.items.filter(i => selectedItems.has(`${supplierGroupKey}-${i.ingredient_id}`)).length} of ${supplier.items.length} items selected`}
                    />
                    {(supplier.supplier_id === null || supplier.supplier_id === undefined) && (
                      <Chip
                        label="Draft without supplier"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      color="primary.main"
                      sx={{ mr: 2 }}
                    >
                      ${supplierTotal.toFixed(2)}
                    </Typography>
                    {expandedSuppliers.has(supplierGroupKey) ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>

                  <Collapse
                    in={expandedSuppliers.has(supplierGroupKey)}
                    timeout="auto"
                    unmountOnExit
                  >
                    <Divider />
                    <Table size="small" sx={{ ml: 4, width: 'calc(100% - 32px)', mb: 1 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>Ingredient</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Line Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {supplier.items.map(item => {
                          const key = `${supplierGroupKey}-${item.ingredient_id}`;
                          const isSelected = selectedItems.has(key);
                          const qty = selectedItems.get(key) || item.quantity_to_order;
                          const explanation = item.explanation;
                          const assumptionWarnings = getAssumptionWarnings(item);

                          return (
                            <TableRow key={key} sx={{ opacity: isSelected ? 1 : 0.5 }}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() =>
                                    toggleItemSelection(
                                      supplier.supplier_id,
                                      item.ingredient_id,
                                      item.quantity_to_order
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{item.ingredient_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Suggested: {item.quantity_to_order} {item.unit}
                                </Typography>
                                {item.explanation?.summary && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.5 }}
                                  >
                                    {item.explanation.summary}
                                  </Typography>
                                )}
                                {explanation && (
                                  <Box
                                    sx={{
                                      mt: 1,
                                      p: 1,
                                      borderRadius: 1,
                                      bgcolor: 'grey.50',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block' }}
                                    >
                                      Stock {formatValue(explanation.why_reorder.current_stock)}{' '}
                                      {explanation.why_reorder.current_unit} vs reorder point{' '}
                                      {formatValue(explanation.why_reorder.reorder_point)}.
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block' }}
                                    >
                                      Lead {formatValue(explanation.why_reorder.lead_demand)} +
                                      shelf {formatValue(explanation.why_reorder.shelf_demand)} +
                                      safety {formatValue(explanation.why_reorder.safety_stock)} =
                                      target {formatValue(explanation.why_reorder.reorder_target)}.
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block' }}
                                    >
                                      ABC {explanation.policy_factors.abc_class} x
                                      {formatValue(explanation.policy_factors.abc_multiplier)}; MOQ
                                      floor {formatValue(explanation.policy_factors.moq_floor)};
                                      final before packs{' '}
                                      {formatValue(
                                        explanation.quantity_factors
                                          .final_quantity_before_pack_rounding
                                      )}
                                      .
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block' }}
                                    >
                                      {formatValue(explanation.quantity_factors.packs_to_order)}{' '}
                                      packs x{' '}
                                      {formatValue(explanation.quantity_factors.quantity_per_pack)}{' '}
                                      {explanation.quantity_factors.supplier_unit} ={' '}
                                      {formatValue(
                                        explanation.quantity_factors.total_quantity_ordered
                                      )}{' '}
                                      {explanation.quantity_factors.supplier_unit}.
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block' }}
                                    >
                                      Supplier: {explanation.supplier_factors.selected_supplier} (
                                      {formatSelectionRule(
                                        explanation.supplier_factors.selection_rule
                                      )}
                                      ).
                                    </Typography>
                                    {assumptionWarnings.length > 0 && (
                                      <Typography
                                        variant="caption"
                                        color="warning.main"
                                        sx={{ display: 'block', mt: 0.5 }}
                                      >
                                        Assumptions: {assumptionWarnings.join(', ')}.
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="center"
                                  spacing={0.5}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => updateItemQty(key, -1)}
                                    disabled={!isSelected}
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                  <Typography
                                    sx={{
                                      minWidth: 40,
                                      textAlign: 'center',
                                      fontWeight: qty !== item.quantity_to_order ? 600 : 400,
                                      color:
                                        qty !== item.quantity_to_order ? 'primary.main' : 'inherit',
                                    }}
                                  >
                                    {qty}
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => updateItemQty(key, 1)}
                                    disabled={!isSelected}
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 500 }}>
                                ${(qty * item.unit_price).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Collapse>
                </Paper>
              );
            })}
          </List>
        </Box>

        {showNotes && (
          <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Draft notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                These notes are copied to each draft order created from this grouped review.
              </Typography>
              <TextField
                fullWidth
                label="Order Notes (optional)"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                multiline
                rows={2}
              />
            </Stack>
          </Paper>
        )}
      </Box>
    </Fade>
  );
}
