import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text variant="titleLarge">Inventory</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
