import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';

interface Props {
  data: any;
}
export default function BasicOverviewMobile({ data }: Props) {
  const theme = useTheme();
  if (!data) return null;
  const { forecasted_sales_today, top_5_items_today = [], accuracy_yesterday } = data;
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
        Daily Overview (Basic)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <SummaryCard
          title="Forecasted Items"
          value={forecasted_sales_today?.forecasted_quantity ?? 0}
        />
        <SummaryCard
          title="Forecasted Revenue"
          value={`$${(forecasted_sales_today?.forecasted_revenue || 0).toFixed(2)}`}
        />
        <SummaryCard
          title="Accuracy Yesterday"
          value={`${(accuracy_yesterday?.accuracy_percent || 0).toFixed(1)}%`}
        />
      </View>
      <Text style={{ fontWeight: '600', marginTop: 20, marginBottom: 8 }}>
        Top Forecasted Items
      </Text>
      {top_5_items_today.map((i: any) => (
        <View
          key={i.menu_item_id}
          style={{
            padding: 10,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant as string,
            borderRadius: 8,
            marginBottom: 6,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{i.name}</Text>
          <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
            Qty: {i.forecasted_quantity}
          </Text>
        </View>
      ))}
      {top_5_items_today.length === 0 && (
        <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888', fontSize: 12 }}>
          No forecast items.
        </Text>
      )}
    </View>
  );
}

function SummaryCard({ title, value }: { title: string; value: any }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: '30%',
        minWidth: 110,
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: 12,
        elevation: 2,
        marginRight: 10,
        marginBottom: 10,
      }}
    >
      <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
