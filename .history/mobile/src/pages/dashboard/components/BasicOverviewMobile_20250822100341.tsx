import React, { useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Button, Snackbar, Switch, TextInput as PaperInput, useTheme } from 'react-native-paper';
import DateSelector from '../../../components/DateSelector';
import * as DocumentPicker from 'expo-document-picker';
import { uploadSalesData } from '../../../../api/dashboard';

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [manualQty, setManualQty] = useState('');
  const [manualMenuItemId, setManualMenuItemId] = useState('');

  const onUploadSales = () => setSheetOpen(true);

  const handlePickAndUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      // On Expo, we can pass the file via fetch with uri/name/type
      const uploadFile: any = { uri: file.uri, name: file.name || 'sales_upload', type: file.mimeType || 'application/octet-stream' };
      await uploadSalesData(uploadFile, overwrite);
      setSheetOpen(false);
      setSnackbar({ visible: true, message: 'Sales uploaded successfully' });
    } catch (e: any) {
      setSnackbar({ visible: true, message: `Upload failed: ${e?.message || e}` });
    }
  };

  const handleManualSubmit = async () => {
    try {
      const qty = parseInt(manualQty, 10);
      const menuItemId = parseInt(manualMenuItemId, 10);
      if (!menuItemId || isNaN(qty)) {
        setSnackbar({ visible: true, message: 'Enter valid menu item ID and quantity' });
        return;
      }
      const saleDate = templateDate.toISOString().slice(0, 10);
      const res = await fetch(
        `${process.env.API_BASE_URL || 'http://10.0.2.2:8000/api/v1'}/dashboard/upload-sales-manual`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sale_date: saleDate, overwrite, entries: [{ menu_item_id: menuItemId, quantity_sold: qty }] }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status}: ${errText}`);
      }
      setSheetOpen(false);
      setManualQty('');
      setManualMenuItemId('');
      setSnackbar({ visible: true, message: 'Manual sales saved' });
    } catch (e: any) {
      setSnackbar({ visible: true, message: `Manual upload failed: ${e?.message || e}` });
    }
  };
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Daily Overview</Text>

  {/* Summary cards with equal heights (sparklines removed per request) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <SummaryCard
          title="Forecasted Items"
          value={String(forecasted_sales_today?.forecasted_quantity ?? 0)}
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
          endDate={templateDate}
          onStartDateChange={setTemplateDate}
          onEndDateChange={setTemplateDate}
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

      {/* Bottom sheet modal for upload options */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setSheetOpen(false)} />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            padding: 16,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Upload Sales Data</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ flex: 1 }}>Overwrite existing for this date</Text>
            <Switch value={overwrite} onValueChange={setOverwrite} />
          </View>
          <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888', marginBottom: 6 }}>
            Date: {templateDate.toISOString().slice(0,10)}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <Button mode="contained" onPress={handlePickAndUpload} style={{ marginRight: 8 }}>
              Pick File (CSV/XLSX)
            </Button>
            <Button mode="outlined" onPress={handleManualSubmit}>
              Save Manual
            </Button>
          </View>
          <View style={{ height: 8 }} />
          <ScrollView horizontal>
            <View style={{ minWidth: '80%' }}>
              <Text style={{ fontWeight: '600', marginBottom: 6 }}>Manual Entry (single row)</Text>
              <PaperInput
                mode="outlined"
                label="Menu Item ID"
                value={manualMenuItemId}
                onChangeText={setManualMenuItemId}
                keyboardType="numeric"
                style={{ marginBottom: 8 }}
              />
              <PaperInput
                mode="outlined"
                label="Quantity Sold"
                value={manualQty}
                onChangeText={setManualQty}
                keyboardType="numeric"
                style={{ marginBottom: 8 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: any;
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
      {/* Sparkline intentionally removed */}
    </View>
  );
}

