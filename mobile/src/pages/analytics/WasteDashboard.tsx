import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, TextInput } from 'react-native';

interface WasteItem {
  id: number;
  type: string;
  item: string;
  quantity: number;
  cost: number;
  reason: string;
  date: string;
}
const data: WasteItem[] = [
  {
    id: 1,
    type: 'Ingredient',
    item: 'Tomatoes',
    quantity: 5,
    cost: 15,
    reason: 'Prep leftovers',
    date: '2025-06-01',
  },
  {
    id: 2,
    type: 'Spoilage',
    item: 'Lettuce',
    quantity: 3,
    cost: 9,
    reason: 'Expired',
    date: '2025-06-02',
  },
  {
    id: 3,
    type: 'Prep Batch',
    item: 'Caesar Dressing',
    quantity: 1,
    cost: 4,
    reason: 'Leftover',
    date: '2025-06-02',
  },
  {
    id: 4,
    type: 'Ingredient',
    item: 'Chicken Breast',
    quantity: 4,
    cost: 40,
    reason: 'Over portioned',
    date: '2025-06-03',
  },
  {
    id: 5,
    type: 'Spoilage',
    item: 'Mozzarella',
    quantity: 2,
    cost: 20,
    reason: 'Expired',
    date: '2025-06-04',
  },
  {
    id: 6,
    type: 'Prep Batch',
    item: 'Tomato Sauce',
    quantity: 1.5,
    cost: 6,
    reason: 'Spoiled',
    date: '2025-06-05',
  },
];
const wasteTypes = ['All', 'Ingredient', 'Prep Batch', 'Spoilage'];

export default function WasteDashboard() {
  const [filterType, setFilterType] = useState('All');
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-07');
  const filtered = useMemo(
    () =>
      data.filter(
        w =>
          (filterType === 'All' || w.type === filterType) &&
          new Date(w.date) >= new Date(startDate) &&
          new Date(w.date) <= new Date(endDate)
      ),
    [filterType, startDate, endDate]
  );
  const totalQty = filtered.reduce((s, w) => s + w.quantity, 0);
  const totalCost = filtered.reduce((s, w) => s + w.cost, 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Waste Dashboard</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          {wasteTypes.map(t => (
            <Chip key={t} label={t} active={filterType === t} onPress={() => setFilterType(t)} />
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 6,
            padding: 8,
            marginRight: 8,
          }}
        />
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8 }}
        />
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#fee2e2',
            padding: 12,
            borderRadius: 8,
            marginRight: 8,
          }}
        >
          <Text style={{ fontWeight: '600', color: '#991b1b' }}>Total Waste (lbs)</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#b91c1c' }}>
            {totalQty.toFixed(1)}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#fee2e2', padding: 12, borderRadius: 8 }}>
          <Text style={{ fontWeight: '600', color: '#991b1b' }}>Total Waste Cost ($)</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#b91c1c' }}>
            ${totalCost.toFixed(2)}
          </Text>
        </View>
      </View>
      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontWeight: '600', marginBottom: 4 }}>Waste Trend</Text>
        <Text style={{ fontSize: 12, color: '#555' }}>* Chart placeholder</Text>
      </View>
      {filtered.map(w => (
        <View key={w.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <Text style={{ fontWeight: '600' }}>
            {w.date} - {w.item} ({w.type})
          </Text>
          <Text style={{ fontSize: 12, color: '#555' }}>
            Qty: {w.quantity.toFixed(1)} Cost: ${w.cost.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 12 }}>{w.reason}</Text>
        </View>
      ))}
      {filtered.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>No waste records.</Text>
      )}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: active ? '#dc2626' : '#f3f4f6',
        color: active ? 'white' : '#111',
        borderRadius: 16,
        marginRight: 8,
      }}
    >
      {label}
    </Text>
  );
}
