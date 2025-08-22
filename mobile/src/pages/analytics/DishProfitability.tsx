import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, TextInput } from 'react-native';

interface Dish {
  id: number;
  name: string;
  category: string;
  salesCount: number;
  salesRevenue: number;
  costOfIngredients: number;
  prepCost: number;
}
const data: Dish[] = [
  {
    id: 1,
    name: 'Margherita Pizza',
    category: 'Pizza',
    salesCount: 120,
    salesRevenue: 2400,
    costOfIngredients: 900,
    prepCost: 300,
  },
  {
    id: 2,
    name: 'Caesar Salad',
    category: 'Salads',
    salesCount: 80,
    salesRevenue: 1200,
    costOfIngredients: 600,
    prepCost: 150,
  },
  {
    id: 3,
    name: 'BBQ Wings',
    category: 'Appetizers',
    salesCount: 50,
    salesRevenue: 1000,
    costOfIngredients: 550,
    prepCost: 200,
  },
  {
    id: 4,
    name: 'Veggie Burger',
    category: 'Burgers',
    salesCount: 30,
    salesRevenue: 600,
    costOfIngredients: 420,
    prepCost: 120,
  },
  {
    id: 5,
    name: 'Chocolate Cake',
    category: 'Desserts',
    salesCount: 25,
    salesRevenue: 375,
    costOfIngredients: 225,
    prepCost: 75,
  },
];
const calc = (d: Dish) => {
  const total = d.costOfIngredients + d.prepCost;
  const profit = d.salesRevenue - total;
  const margin = d.salesRevenue ? (profit / d.salesRevenue) * 100 : 0;
  return { profit, margin };
};
const categories = Array.from(new Set(data.map(d => d.category)));

export default function DishProfitability() {
  const [category, setCategory] = useState('');
  const [minSales, setMinSales] = useState(0);
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () =>
      data.filter(
        d =>
          (!category || d.category === category) &&
          d.salesCount >= minSales &&
          (!search || d.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [category, minSales, search]
  );
  const totalProfit = filtered.reduce((s, d) => s + calc(d).profit, 0).toFixed(2);
  const avgMargin = filtered.length
    ? (filtered.reduce((s, d) => s + calc(d).margin, 0) / filtered.length).toFixed(1)
    : '0';
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Dish Profitability</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="All" active={category === ''} onPress={() => setCategory('')} />
          {categories.map(c => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TextInput
          value={String(minSales)}
          onChangeText={t => setMinSales(Number(t) || 0)}
          keyboardType="numeric"
          placeholder="Min Sales"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            padding: 8,
            marginRight: 8,
          }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search..."
          style={{ flex: 2, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 }}
        />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text>
          Total Profit: <Text style={{ color: '#16a34a' }}>${totalProfit}</Text>
        </Text>
        <Text>
          Avg Margin: <Text style={{ color: '#16a34a' }}>{avgMargin}%</Text>
        </Text>
        <Text>Dishes: {filtered.length}</Text>
      </View>
      {filtered.map(d => {
        const { profit, margin } = calc(d);
        const bg = margin < 10 ? '#fee2e2' : margin < 20 ? '#fef3c7' : '#dcfce7';
        return (
          <View
            key={d.id}
            style={{ padding: 12, backgroundColor: bg, borderRadius: 8, marginBottom: 8 }}
          >
            <Text style={{ fontWeight: '600' }}>{d.name}</Text>
            <Text style={{ fontSize: 12, color: '#555' }}>{d.category}</Text>
            <Text style={{ marginTop: 4 }}>
              Sales: {d.salesCount} Rev: ${d.salesRevenue.toFixed(2)}
            </Text>
            <Text>
              Profit: ${profit.toFixed(2)} Margin: {margin.toFixed(1)}%
            </Text>
          </View>
        );
      })}
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
        backgroundColor: active ? '#2563eb' : '#e5e7eb',
        color: active ? 'white' : '#111',
        borderRadius: 16,
        marginRight: 8,
      }}
    >
      {label}
    </Text>
  );
}
