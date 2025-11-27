// src/pages/inventory/components/StockMovementCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { StockMovement } from '../../../interfaces/inventory';

interface MovementStyle {
  icon: string;
  color: string;
  bgColor: string;
}

interface StockMovementCardProps {
  movement: StockMovement;
  getMovementStyle: (type: string, qty: number) => MovementStyle;
}

export function StockMovementCard({
  movement,
  getMovementStyle,
}: StockMovementCardProps): React.JSX.Element {
  const theme = useTheme();
  const style = getMovementStyle(movement.type, movement.quantity);
  const isPositive =
    movement.type === 'Purchase' || movement.type === 'Adjustment' || movement.quantity > 0;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View style={[styles.movementIndicator, { backgroundColor: style.bgColor }]}>
          <MaterialCommunityIcons name={style.icon as any} size={20} color={style.color} />
        </View>

        <View style={styles.movementInfo}>
          <Text variant="titleSmall" style={styles.ingredientName} numberOfLines={1}>
            {movement.ingredient_name || 'Unknown Item'}
          </Text>
          <View style={styles.detailRow}>
            <View style={[styles.typeBadge, { backgroundColor: style.bgColor }]}>
              <Text variant="labelSmall" style={{ color: style.color }}>
                {movement.type}
              </Text>
            </View>
            {movement.source_or_destination && (
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
                numberOfLines={1}
              >
                {movement.source_or_destination}
              </Text>
            )}
          </View>
          {movement.notes && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              numberOfLines={1}
            >
              {movement.notes}
            </Text>
          )}
        </View>

        <View style={styles.quantitySection}>
          <Text variant="titleMedium" style={[styles.quantity, { color: style.color }]}>
            {isPositive ? '+' : ''}
            {movement.quantity}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {movement.unit}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  quantitySection: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontWeight: '700',
  },
});

export default StockMovementCard;
