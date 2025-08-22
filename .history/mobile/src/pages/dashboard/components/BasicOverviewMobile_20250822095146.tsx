import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Button, Snackbar, useTheme } from 'react-native-paper';
import DateSelector from '../../../components/DateSelector';
import Svg, { Path } from 'react-native-svg';

interface Props {
  data: any;
}
export default function BasicOverviewMobile({ data }: Props) {
  const theme = useTheme();
  const [templateDate, setTemplateDate] = useState<Date>(new Date());
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>(
    { visible: false, message: '' }
  );
  if (!data) return null;
  const { forecasted_sales_today, top_5_items_today = [], accuracy_yesterday } = data;
  const maxQty = useMemo(
    () => Math.max(1, ...top_5_items_today.map((i: any) => Number(i.forecasted_quantity || 0))),
    [top_5_items_today]
  );

  const onDownloadTemplate = async () => {
    // TODO: wire to backend download endpoint using mobile API client
    setSnackbar({ visible: true, message: 'Template download requested' });
  };
  const onUploadSales = async () => {
    // TODO: add DocumentPicker + upload; for now simulate success
    setSnackbar({ visible: true, message: 'Sales data uploaded' });
  };
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Daily Overview</Text>

      {/* Summary cards with equal heights and tiny sparklines */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <SummaryCard
          title="Forecasted Items"
          value={String(forecasted_sales_today?.forecasted_quantity ?? 0)}
          sparklineData={makeSparkFromSeed(
            Number(forecasted_sales_today?.forecasted_quantity ?? 0)
          )}
        />
        <SummaryCard
          title="Forecasted Revenue"
          value={`$${(forecasted_sales_today?.forecasted_revenue || 0).toFixed(2)}`}
          sparklineData={makeSparkFromSeed(
            Number(forecasted_sales_today?.forecasted_revenue ?? 0) / 10
          )}
        />
        <SummaryCard
          title="Accuracy Yesterday"
          value={`${(accuracy_yesterday?.accuracy_percent || 0).toFixed(1)}%`}
          sparklineData={makeSparkFromSeed(Number(accuracy_yesterday?.accuracy_percent ?? 0))}
        />
      </View>

      {/* Actions: date selector + buttons */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
          marginBottom: 16,
        }}
      >
        <DateSelector
          label="Select date for sales template"
          startDate={templateDate}
          onStartDateChange={setTemplateDate}
          mode="single"
        />
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Button mode="contained-tonal" onPress={onDownloadTemplate} style={{ marginRight: 8 }}>
            Download Template
          </Button>
          <Button mode="contained" onPress={onUploadSales}>
            Upload Sales Data
          </Button>
        </View>
      </View>

      {/* Top Forecasted Items as progress bars */}
      <Text style={{ fontWeight: '600', marginTop: 4, marginBottom: 8 }}>Top Forecasted Items</Text>
      {top_5_items_today.map((i: any) => {
        const qty = Number(i.forecasted_quantity || 0);
        const pct = Math.max(0, Math.min(100, (qty / maxQty) * 100));
        return (
          <View
            key={i.menu_item_id}
            style={{
              paddingVertical: 8,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontWeight: '600', flex: 1, marginRight: 8 }} numberOfLines={1}>
                {i.name}
              </Text>
              <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
                {qty}
              </Text>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 6,
                backgroundColor: (theme.colors.surfaceVariant as string) || '#e5e7eb',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: theme.colors.primary,
                }}
              />
            </View>
          </View>
        );
      })}
      {top_5_items_today.length === 0 && (
        <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888', fontSize: 12 }}>
          No forecast items.
        </Text>
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2500}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

function SummaryCard({
  title,
  value,
  sparklineData,
}: {
  title: string;
  value: any;
  sparklineData?: number[];
}) {
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
        minHeight: 120,
      }}
    >
      <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
        {title}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6 }}>{value}</Text>
      <View style={{ height: 36 }}>
        <Sparkline data={sparklineData || makeSparkFromSeed(10)} color={theme.colors.primary} />
      </View>
    </View>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const width = 120;
  const height = 36;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return { x, y };
  });
  const d = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={d} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function makeSparkFromSeed(seed: number) {
  // lightweight deterministic-ish series from a seed value
  const base = Math.max(1, Math.min(1000, Math.round(seed) || 10));
  const out: number[] = [];
  let v = base % 97;
  for (let i = 0; i < 12; i++) {
    v = (v * 13 + 17) % 101;
    out.push(base * 0.6 + (v - 50));
  }
  return out;
}
