import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Button, Snackbar, Dialog, Portal, Text as PaperText, TextInput as PaperInput, useTheme, Chip } from 'react-native-paper';
import DateSelector from '../../../components/DateSelector';
import * as DocumentPicker from 'expo-document-picker';
import { uploadSalesData, uploadSalesManual, getMenuItems as getMenuItemsApi, checkSalesExist } from '../../../api/dashboard';
import { getRestaurantSettings } from '../../../api/settings';

interface Props {
  data: any;
}
export default function BasicOverviewMobile({ data }: Props) {
  const theme = useTheme();
  const [templateDate, setTemplateDate] = useState<Date>(new Date());
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
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
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, number>>({});
  // Manual multi-entry state
  const [menuItems, setMenuItems] = useState<Array<{ menu_item_id: number; name: string }>>([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [qtyById, setQtyById] = useState<Record<number, string>>({});
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null); // null => unspecified

  const onUploadSales = () => setSheetOpen(true);

  // Fetch menu items when opening the sheet so users don't need to know IDs
  useEffect(() => {
    const run = async () => {
      if (!sheetOpen) return;
      try {
        setMenuItemsLoading(true);
        const items = (await getMenuItemsApi()) as Array<any>;
        setMenuItems(items?.map((i) => ({ menu_item_id: i.menu_item_id, name: i.name })) || []);
        // Load restaurant sales channels for per-channel uploads
        try {
          const settings = await getRestaurantSettings();
          const channels = (settings?.sales_channels as string[]) || [];
          setAvailableChannels(channels);
          // keep previous selection if still valid, else default to null (unspecified)
          setSelectedChannel((prev) => (prev && channels.includes(prev) ? prev : null));
        } catch {}
      } catch (e) {
        setSnackbar({ visible: true, message: 'Failed to load menu items' });
      } finally {
        setMenuItemsLoading(false);
      }
    };
    run();
  }, [sheetOpen]);

  const handlePickAndUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      // On Expo, we can pass the file via fetch with uri/name/type
      const uploadFile: any = {
        uri: file.uri,
        name: file.name || 'sales_upload',
        type: file.mimeType || 'application/octet-stream',
      };
  // Try upload without overwrite; if server reports conflict, prompt user in a future flow
  await uploadSalesData(uploadFile, false);
      setSheetOpen(false);
      setSnackbar({ visible: true, message: 'Sales uploaded successfully' });
    } catch (e: any) {
      setSnackbar({ visible: true, message: `Upload failed: ${e?.message || e}` });
    }
  };

  const handleManualSubmit = async () => {
    const entries = Object.entries(qtyById)
      .map(([id, val]) => ({ id: Number(id), qty: parseInt((val || '0') as string, 10) }))
      .filter((r) => r.id && r.qty && r.qty > 0)
      .map((r) => ({ menu_item_id: r.id, quantity_sold: r.qty, sales_channel: selectedChannel ?? undefined }));
    if (!entries.length) {
      setSnackbar({ visible: true, message: 'Enter at least one quantity greater than 0' });
      return;
    }
    const saleDate = templateDate.toISOString().slice(0, 10);
    try {
      // Check conflicts for unspecified channel (null) since manual UI has no channel selector yet
  const result = await checkSalesExist(saleDate, [selectedChannel ?? 'null']);
      const confRaw = (result && result.conflicts) || {};
      const conf: Record<string, number> = {};
      Object.entries(confRaw).forEach(([k, v]) => {
        const key = (k === null || k === 'null') ? 'null' : String(k);
        conf[key] = Number(v as any) || 0;
      });
      if (Object.keys(conf).length) {
        setConflicts(conf);
        setConfirmVisible(true);
        return;
      }
      // No conflicts, proceed without overwrite
      await uploadSalesManual({ sale_date: saleDate, overwrite: false, entries });
      setSheetOpen(false);
      setQtyById({});
      setSnackbar({ visible: true, message: 'Manual sales saved' });
    } catch (e: any) {
  const msg = String(e?.message || e || 'Manual upload failed');
  setSnackbar({ visible: true, message: msg });
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
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
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
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setSheetOpen(false)}
        />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            padding: 16,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
            Upload Sales Data
          </Text>
          {/* Channel selection for manual upload */}
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Sales Channel</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
            <Chip
              selected={selectedChannel == null}
              onPress={() => setSelectedChannel(null)}
              style={{ marginRight: 6, marginBottom: 6 }}
            >
              Unspecified
            </Chip>
            {availableChannels.map((ch) => (
              <Chip
                key={ch}
                selected={selectedChannel === ch}
                onPress={() => setSelectedChannel(ch)}
                style={{ marginRight: 6, marginBottom: 6 }}
              >
                {ch}
              </Chip>
            ))}
          </View>
          {/* Overwrite toggle removed in favor of check-then-confirm flow */}
          <Text
            style={{ color: (theme.colors.onSurfaceVariant as string) || '#888', marginBottom: 6 }}
          >
            Date: {templateDate.toISOString().slice(0, 10)}
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
          {/* Manual multi-entry UI */}
          {menuItemsLoading ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 6 }}>Loading menu items…</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 380 }}>
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: '600', marginBottom: 6 }}>Manual Entry (multiple)</Text>
                <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888', marginBottom: 8 }}>
                  Enter quantities for any menu items below; leave blank or 0 to skip.
                </Text>
                <PaperInput
                  mode="outlined"
                  label="Filter menu items"
                  value={filter}
                  onChangeText={setFilter}
                  style={{ marginBottom: 8 }}
                />
              </View>
              <View>
                {menuItems
                  .filter((m) =>
                    !filter
                      ? true
                      : m.name.toLowerCase().includes(filter.toLowerCase()) ||
                        String(m.menu_item_id).includes(filter)
                  )
                  .map((m) => (
                    <View key={m.menu_item_id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ flex: 1 }} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <PaperInput
                        mode="outlined"
                        dense
                        keyboardType="numeric"
                        placeholder="0"
                        value={qtyById[m.menu_item_id] ?? ''}
                        onChangeText={(v) =>
                          setQtyById((prev) => ({ ...prev, [m.menu_item_id]: v.replace(/[^0-9]/g, '') }))
                        }
                        style={{ width: 100 }}
                      />
                    </View>
                  ))}
                {menuItems.length === 0 && (
                  <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888' }}>No menu items found.</Text>
                )}
              </View>
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row' }}>
                <Button mode="text" onPress={() => setQtyById({})} style={{ marginRight: 8 }}>
                  Clear all
                </Button>
                <Button
                  mode="text"
                  onPress={() => {
                    setQtyById((prev) => {
                      const next = { ...prev } as Record<number, string>;
                      menuItems
                        .filter((m) =>
                          !filter
                            ? true
                            : m.name.toLowerCase().includes(filter.toLowerCase()) ||
                              String(m.menu_item_id).includes(filter)
                        )
                        .forEach((m) => (next[m.menu_item_id] = next[m.menu_item_id] ?? '1'));
                      return next;
                    });
                  }}
                >
                  Quick fill 1s (filtered)
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Overwrite existing sales?</Dialog.Title>
          <Dialog.Content>
            <PaperText>
              Sales already exist for this date in the following channel(s):
            </PaperText>
      {Object.entries(conflicts).map(([ch, cnt]) => (
              <PaperText key={ch || 'null'}>
        {(ch === 'null' || ch === '' || ch == null) ? 'unspecified' : ch} — {String(cnt)} records
              </PaperText>
            ))}
            <PaperText style={{ marginTop: 8 }}>
              Proceed to overwrite these channel(s)?
            </PaperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button
              onPress={async () => {
                try {
                  const saleDate = templateDate.toISOString().slice(0, 10);
                  const entries = Object.entries(qtyById)
                    .map(([id, val]) => ({ id: Number(id), qty: parseInt((val || '0') as string, 10) }))
                    .filter((r) => r.id && r.qty && r.qty > 0)
                    .map((r) => ({ menu_item_id: r.id, quantity_sold: r.qty }));
                  await uploadSalesManual({ sale_date: saleDate, overwrite: true, entries });
                  setConfirmVisible(false);
                  setSheetOpen(false);
                  setQtyById({});
                  setSnackbar({ visible: true, message: 'Manual sales overwritten' });
                } catch (e: any) {
                  setSnackbar({ visible: true, message: String(e?.message || e) });
                }
              }}
            >
              Overwrite
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
