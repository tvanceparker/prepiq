// src/pages/inventory/components/po-wizard/POMethodSelector.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type WizardMode = 'supplier' | 'ingredient';

interface POMethodSelectorProps {
  selectedMode: WizardMode | null;
  onSelectMode: (mode: WizardMode) => void;
}

export default function POMethodSelector({
  selectedMode,
  onSelectMode,
}: POMethodSelectorProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        How would you like to order?
      </Text>
      <Text variant="bodySmall" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Choose based on your needs
      </Text>

      <Card
        style={[
          styles.methodCard,
          selectedMode === 'supplier' && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
        mode="outlined"
        onPress={() => onSelectMode('supplier')}
      >
        <Card.Content style={styles.methodCardContent}>
          <View style={[styles.methodIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="truck-delivery" size={32} color={theme.colors.primary} />
          </View>
          <Text variant="titleMedium" style={styles.methodTitle}>
            By Supplier
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.methodDescription, { color: theme.colors.onSurfaceVariant }]}
          >
            AI-powered suggestions based on forecasted demand
          </Text>
          <View style={styles.methodChips}>
            <Chip compact icon="auto-fix" mode="outlined" style={styles.methodChip}>
              AI Suggested
            </Chip>
            <Chip compact icon="chart-line" mode="outlined" style={styles.methodChip}>
              Forecast
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card
        style={[
          styles.methodCard,
          selectedMode === 'ingredient' && { borderColor: theme.colors.secondary, borderWidth: 2 },
        ]}
        mode="outlined"
        onPress={() => onSelectMode('ingredient')}
      >
        <Card.Content style={styles.methodCardContent}>
          <View style={[styles.methodIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons name="food-variant" size={32} color={theme.colors.secondary} />
          </View>
          <Text variant="titleMedium" style={styles.methodTitle}>
            By Ingredient
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.methodDescription, { color: theme.colors.onSurfaceVariant }]}
          >
            Browse stock levels and compare supplier prices
          </Text>
          <View style={styles.methodChips}>
            <Chip compact icon="alert" mode="outlined" style={styles.methodChip}>
              Stock Levels
            </Chip>
            <Chip compact icon="cart" mode="outlined" style={styles.methodChip}>
              Compare
            </Chip>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  methodCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  methodCardContent: {
    alignItems: 'center',
    padding: 16,
  },
  methodIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  methodTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    textAlign: 'center',
  },
  methodChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  methodChip: {
    height: 28,
  },
});
