// src/pages/prep/components/PrepLogFilters.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Surface, Text, Chip, Menu, Divider, useTheme, Portal } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BatchRecipe } from '../../../interfaces/prep';

type PrepStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | '';

interface PrepLogFiltersProps {
  startDate: string;
  endDate: string;
  statusFilter: PrepStatus;
  batchRecipeFilter: number | null;
  batchRecipes: BatchRecipe[];
  hasActiveFilters: boolean;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onStatusChange: (status: PrepStatus) => void;
  onBatchRecipeChange: (id: number | null) => void;
  onClearFilters: () => void;
}

const STATUS_OPTIONS: { value: PrepStatus; label: string; color: string }[] = [
  { value: '', label: 'All', color: '#9e9e9e' },
  { value: 'scheduled', label: 'Scheduled', color: '#2196f3' },
  { value: 'in_progress', label: 'In Progress', color: '#ff9800' },
  { value: 'completed', label: 'Completed', color: '#4caf50' },
  { value: 'cancelled', label: 'Cancelled', color: '#f44336' },
];

export function PrepLogFilters({
  startDate,
  endDate,
  statusFilter,
  batchRecipeFilter,
  batchRecipes,
  hasActiveFilters,
  onStartDateChange,
  onEndDateChange,
  onStatusChange,
  onBatchRecipeChange,
  onClearFilters,
}: PrepLogFiltersProps): React.JSX.Element {
  const theme = useTheme();

  // Menu states
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [recipeMenuVisible, setRecipeMenuVisible] = useState(false);

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const selectedRecipe = batchRecipes.find(r => r.batch_recipe_id === batchRecipeFilter);
  const selectedStatus = STATUS_OPTIONS.find(s => s.value === statusFilter);

  const handleStartDateConfirm = (params: { date: Date | undefined }) => {
    setShowStartPicker(false);
    if (params.date) {
      onStartDateChange(params.date.toISOString().split('T')[0]);
    }
  };

  const handleEndDateConfirm = (params: { date: Date | undefined }) => {
    setShowEndPicker(false);
    if (params.date) {
      onEndDateChange(params.date.toISOString().split('T')[0]);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={{ fontWeight: '600' }}>
          Filters
        </Text>
        {hasActiveFilters && (
          <Pressable onPress={onClearFilters}>
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              Clear All
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {/* Start Date */}
        <Pressable onPress={() => setShowStartPicker(true)}>
          <Chip
            icon={() => (
              <MaterialCommunityIcons
                name="calendar"
                size={16}
                color={startDate ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            )}
            style={[styles.filterChip, startDate && styles.activeFilterChip]}
            textStyle={startDate ? { color: theme.colors.primary } : undefined}
            onClose={startDate ? () => onStartDateChange('') : undefined}
          >
            {startDate ? formatDisplayDate(startDate) : 'Start Date'}
          </Chip>
        </Pressable>

        {/* End Date */}
        <Pressable onPress={() => setShowEndPicker(true)}>
          <Chip
            icon={() => (
              <MaterialCommunityIcons
                name="calendar"
                size={16}
                color={endDate ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            )}
            style={[styles.filterChip, endDate && styles.activeFilterChip]}
            textStyle={endDate ? { color: theme.colors.primary } : undefined}
            onClose={endDate ? () => onEndDateChange('') : undefined}
          >
            {endDate ? formatDisplayDate(endDate) : 'End Date'}
          </Chip>
        </Pressable>

        {/* Status Filter */}
        <Menu
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setStatusMenuVisible(true)}>
              <Chip
                icon={() => (
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: selectedStatus?.color || '#9e9e9e' },
                    ]}
                  />
                )}
                style={[styles.filterChip, statusFilter && styles.activeFilterChip]}
                textStyle={statusFilter ? { color: theme.colors.primary } : undefined}
                onClose={statusFilter ? () => onStatusChange('') : undefined}
              >
                {selectedStatus?.label || 'Status'}
              </Chip>
            </Pressable>
          }
        >
          {STATUS_OPTIONS.map(option => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                onStatusChange(option.value);
                setStatusMenuVisible(false);
              }}
              title={option.label}
              leadingIcon={() => (
                <View style={[styles.menuDot, { backgroundColor: option.color }]} />
              )}
            />
          ))}
        </Menu>

        {/* Batch Recipe Filter */}
        <Menu
          visible={recipeMenuVisible}
          onDismiss={() => setRecipeMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setRecipeMenuVisible(true)}>
              <Chip
                icon={() => (
                  <MaterialCommunityIcons
                    name="chef-hat"
                    size={16}
                    color={batchRecipeFilter ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                )}
                style={[styles.filterChip, batchRecipeFilter != null && styles.activeFilterChip]}
                textStyle={batchRecipeFilter != null ? { color: theme.colors.primary } : undefined}
                onClose={batchRecipeFilter != null ? () => onBatchRecipeChange(null) : undefined}
              >
                {selectedRecipe?.name || 'Batch Recipe'}
              </Chip>
            </Pressable>
          }
        >
          <Menu.Item
            onPress={() => {
              onBatchRecipeChange(null);
              setRecipeMenuVisible(false);
            }}
            title="All Recipes"
          />
          <Divider />
          <ScrollView style={{ maxHeight: 300 }}>
            {batchRecipes.map(recipe => (
              <Menu.Item
                key={recipe.batch_recipe_id}
                onPress={() => {
                  onBatchRecipeChange(recipe.batch_recipe_id);
                  setRecipeMenuVisible(false);
                }}
                title={recipe.name}
              />
            ))}
          </ScrollView>
        </Menu>
      </ScrollView>

      {/* Date Pickers - wrapped in Portal for proper layering */}
      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showStartPicker}
          onDismiss={() => setShowStartPicker(false)}
          date={startDate ? new Date(startDate) : undefined}
          onConfirm={handleStartDateConfirm}
          label="Select Start Date"
          saveLabel="Select"
        />
      </Portal>
      <Portal>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={showEndPicker}
          onDismiss={() => setShowEndPicker(false)}
          date={endDate ? new Date(endDate) : undefined}
          onConfirm={handleEndDateConfirm}
          label="Select End Date"
          saveLabel="Select"
        />
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  activeFilterChip: {
    backgroundColor: '#e3f2fd',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
});

export default PrepLogFilters;
