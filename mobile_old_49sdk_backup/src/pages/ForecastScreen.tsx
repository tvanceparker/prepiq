import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, Card } from 'react-native-paper';
import DateSelector from '../components/DateSelector';
import { useForecastTable, useForecastTotals } from '../hooks/useForecast';

export default function ForecastScreen() {
  const [range, setRange] = useState({ start: new Date(), end: new Date() });
  const tableQuery = useForecastTable(range);
  const totalsQuery = useForecastTotals(range);

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Forecast</Text>
      <DateSelector
        startDate={range.start}
        endDate={range.end}
        onStartDateChange={(d) => setRange(r => ({ ...r, start: d }))}
        onEndDateChange={(d) => setRange(r => ({ ...r, end: d }))}
        label="Date Range"
      />
      {totalsQuery.isLoading ? <ActivityIndicator /> : totalsQuery.data && (
        <Text style={styles.subtitle}>Items: {totalsQuery.data.total_items} | Qty: {totalsQuery.data.total_qty}</Text>
      )}
      {tableQuery.isLoading && <ActivityIndicator style={{ marginTop: 16 }} />}
      {!tableQuery.isLoading && (
        <FlatList
          data={tableQuery.data || []}
          keyExtractor={(item) => String(item.menu_item_id)}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title title={item.name} subtitle={`Forecast: ${item.forecast_qty}`} />
            </Card>
          )}
          ListEmptyComponent={<Text>No forecast rows.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  subtitle: { marginBottom: 12 },
  card: { marginBottom: 12 },
});
