// src/pages/team/Employees.tsx
import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  FAB,
  useTheme,
  Searchbar,
  Snackbar,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEmployeeList } from './hooks';
import { EmployeeCard } from './components';
import type { Employee } from '../../interfaces/team';

export default function Employees(): React.ReactElement {
  const theme = useTheme();

  const {
    // State
    searchQuery,
    showCreateDialog,
    editingEmployee,
    formData,
    snackbar,
    refreshing,
    // Data
    filteredEmployees,
    activeCount,
    loading: isLoading,
    creating,
    updating,
    // Actions
    setSearchQuery,
    openCreate,
    openEdit,
    closeDialog,
    handleCreate,
    handleUpdate,
    updateFormField,
    onRefresh,
    dismissSnackbar,
    // Helpers
    getInitials,
    getRoleColor,
  } = useEmployeeList();

  const renderItem = ({ item }: { item: Employee }) => (
    <EmployeeCard
      employee={item}
      onEdit={openEdit}
      getInitials={getInitials}
      getRoleColor={getRoleColor}
    />
  );

  if (isLoading && filteredEmployees.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="account-group" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Team
            </Text>
          </View>
          <View style={styles.statsChips}>
            <Chip icon="account-check">{activeCount} active</Chip>
          </View>
        </View>

        <Searchbar
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
      </Surface>

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="account-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No employees found
          </Text>
          <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
            Add Employee
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={item => item.employee_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* FAB */}
      <FAB
        icon="account-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Create/Edit Dialog */}
      <Portal>
        <Dialog visible={showCreateDialog || !!editingEmployee} onDismiss={closeDialog}>
          <Dialog.Title>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <View style={{ padding: 16 }}>
              <TextInput
                label="Name *"
                value={formData.name}
                onChangeText={text => updateFormField('name', text)}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Email *"
                value={formData.email}
                onChangeText={text => updateFormField('email', text)}
                mode="outlined"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                label="Phone"
                value={formData.phone}
                onChangeText={text => updateFormField('phone', text)}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                label="Role ID"
                value={formData.role_id ? formData.role_id.toString() : ''}
                onChangeText={text => updateFormField('role_id', parseInt(text) || 0)}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
              />
              <TextInput
                label="Hourly Rate"
                value={formData.hourly_rate}
                onChangeText={text => updateFormField('hourly_rate', text)}
                mode="outlined"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={styles.input}
              />
              {!editingEmployee && (
                <TextInput
                  label="Password *"
                  value={formData.password}
                  onChangeText={text => updateFormField('password', text)}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />
              )}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button
              mode="contained"
              onPress={editingEmployee ? handleUpdate : handleCreate}
              loading={creating || updating}
              disabled={!formData.name.trim()}
            >
              {editingEmployee ? 'Save' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Snackbar */}
      <Snackbar visible={snackbar.visible} onDismiss={dismissSnackbar} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsChips: {
    flexDirection: 'row',
    gap: 8,
  },
  searchbar: {
    marginBottom: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
});
