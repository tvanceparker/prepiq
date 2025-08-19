import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, Card } from 'react-native-paper';
import { useInventoryList } from '../hooks/useInventory';

export default function InventoryScreen() {
  const { data, isLoading, refetch, isRefetching } = useInventoryList();

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Inventory</Text>
      {isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}
      {!isLoading && (
        <FlatList
          data={data || []}
          keyExtractor={(item) => String(item.inventory_id)}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title title={item.name} subtitle={`${item.total_quantity} ${item.unit}`} />
            </Card>
          )}
          ListEmptyComponent={<Text>No inventory items.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  card: { marginBottom: 12 },
});
