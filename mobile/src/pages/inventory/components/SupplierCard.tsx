// src/pages/inventory/components/SupplierCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, IconButton, List, Divider, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { SupplierDTO, SupplierIngredient } from '../../../interfaces/inventory';

interface SupplierCardProps {
  supplier: SupplierDTO;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (supplier: SupplierDTO) => void;
  onDelete: (supplier: SupplierDTO) => void;
  onEditIngredient: (ingredient: SupplierIngredient) => void;
  groupIngredients: (ingredients: SupplierIngredient[]) => [string, SupplierIngredient[]][];
}

export function SupplierCard({
  supplier,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onEditIngredient,
  groupIngredients,
}: SupplierCardProps): React.JSX.Element {
  const theme = useTheme();
  const ingredientGroups = groupIngredients(supplier.ingredients || []);
  const ingredientCount = supplier.ingredients?.length || 0;

  return (
    <Card style={styles.card} mode="outlined">
      {/* Header - tap to expand */}
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.supplierInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.supplierName}>
                {supplier.name}
              </Text>
              {supplier.is_active ? (
                <Chip
                  compact
                  mode="flat"
                  style={[styles.statusChip, { backgroundColor: '#e8f5e9' }]}
                  textStyle={{ color: '#2e7d32', fontSize: 10 }}
                >
                  Active
                </Chip>
              ) : (
                <Chip
                  compact
                  mode="flat"
                  style={[styles.statusChip, { backgroundColor: '#ffebee' }]}
                  textStyle={{ color: '#c62828', fontSize: 10 }}
                >
                  Inactive
                </Chip>
              )}
            </View>

            {/* Info chips row */}
            <View style={styles.infoRow}>
              {supplier.type && (
                <Chip
                  icon={() => (
                    <MaterialCommunityIcons name="tag" size={14} color={theme.colors.primary} />
                  )}
                  style={styles.infoChip}
                  textStyle={styles.infoChipText}
                >
                  {supplier.type}
                </Chip>
              )}
              {supplier.region && (
                <Chip
                  icon={() => (
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={14}
                      color={theme.colors.primary}
                    />
                  )}
                  style={styles.infoChip}
                  textStyle={styles.infoChipText}
                >
                  {supplier.region}
                </Chip>
              )}
              {supplier.rating && (
                <Chip
                  icon={() => <MaterialCommunityIcons name="star" size={14} color="#ffc107" />}
                  style={styles.infoChip}
                  textStyle={styles.infoChipText}
                >
                  {supplier.rating.toFixed(1)}
                </Chip>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <IconButton
              icon={() => (
                <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.primary} />
              )}
              size={20}
              onPress={() => onEdit(supplier)}
            />
            <IconButton
              icon={() => <MaterialCommunityIcons name="delete" size={18} color="#f44336" />}
              size={20}
              onPress={() => onDelete(supplier)}
            />
          </View>
        </View>

        {/* Expand button */}
        <View style={styles.expandRow}>
          <Chip
            compact
            mode="outlined"
            icon={() => (
              <MaterialCommunityIcons
                name="package-variant"
                size={14}
                color={theme.colors.primary}
              />
            )}
            onPress={onToggleExpand}
          >
            {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
          </Chip>
          <IconButton
            icon={() => (
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            )}
            size={20}
            onPress={onToggleExpand}
          />
        </View>
      </Card.Content>

      {/* Expanded ingredient list */}
      {expanded && (
        <>
          <Divider />
          <Card.Content>
            {ingredientGroups.length === 0 ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, paddingVertical: 12 }}
              >
                No ingredients linked to this supplier
              </Text>
            ) : (
              ingredientGroups.map(([group, ingredients]) => (
                <View key={group} style={styles.ingredientGroup}>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.primary, marginBottom: 4 }}
                  >
                    {group}
                  </Text>
                  {ingredients.map(ing => (
                    <List.Item
                      key={ing.ingredient_supplier_id}
                      title={ing.ingredient_name}
                      description={`$${ing.cost_per_unit?.toFixed(2) || '0.00'} / ${
                        ing.unit || 'unit'
                      }`}
                      left={() => (
                        <MaterialCommunityIcons
                          name="leaf"
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                      right={() => (
                        <View style={styles.ingredientActions}>
                          {ing.preferred && (
                            <Chip compact style={styles.preferredChip}>
                              <MaterialCommunityIcons name="star" size={12} color="#ffc107" />
                            </Chip>
                          )}
                          <IconButton
                            icon={() => (
                              <MaterialCommunityIcons
                                name="pencil"
                                size={16}
                                color={theme.colors.primary}
                              />
                            )}
                            size={16}
                            onPress={() => onEditIngredient(ing)}
                          />
                        </View>
                      )}
                      style={styles.ingredientItem}
                    />
                  ))}
                </View>
              ))
            )}
          </Card.Content>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplierInfo: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  supplierName: {
    fontWeight: '600',
  },
  statusChip: {
    height: 22,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoChip: {
    height: 26,
    backgroundColor: '#f5f5f5',
  },
  infoChipText: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  ingredientGroup: {
    marginVertical: 8,
  },
  ingredientItem: {
    paddingLeft: 0,
  },
  ingredientActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferredChip: {
    height: 22,
    backgroundColor: '#fff8e1',
  },
});

export default SupplierCard;
