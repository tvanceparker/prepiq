import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { Button, Portal, useTheme } from 'react-native-paper';
import { Animated, Easing } from 'react-native';
import DateSelector from '../../../components/DateSelector';
import { useSalesExplorer } from '../hooks/useSalesExplorer';

export default function SalesExplorerBasicMobile() {
  const theme = useTheme();
  const {
    data,
    menuItems,
    salesChannels,
    loading,
    error,
    filters: { startDate, setStartDate, endDate, setEndDate, menuItemId, setMenuItemId },
    createSaleRecord,
    updateSaleRecord,
  } = useSalesExplorer();

  const [refreshing, setRefreshing] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [form, setForm] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [channelMenuVisible, setChannelMenuVisible] = useState(false);
  const menuScale = useRef(new Animated.Value(0.85)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // trigger fetch by touching the date filters (hook listens to them)
      setStartDate(startDate);
    } finally {
      setRefreshing(false);
    }
  }, [startDate, setStartDate]);

  useEffect(() => {
    if (editRow) setForm({ ...editRow });
    else setForm(null);
  }, [editRow]);

  const saveEdit = async () => {
    if (!editRow || !form) return;
    try {
      // Coerce quantity to integer only
      const payload: any = {};
      // If quantity is provided (non-empty), coerce to integer and include
      if (
        form.quantity_sold !== '' &&
        form.quantity_sold !== null &&
        form.quantity_sold !== undefined
      ) {
        const qty = Math.max(0, Math.floor(Number(form.quantity_sold) || 0));
        payload.quantity_sold = qty;
      }
      // Only include sales_channel if user selected a non-empty value
      if (form.sales_channel) payload.sales_channel = form.sales_channel;

      // Ensure backend gets identifying fields it may validate against: sale_timestamp and menu_item_id
      // Prefer the edited form values if present, otherwise fall back to the original row data
      const ts =
        form.sale_timestamp ||
        editRow.sale_timestamp ||
        editRow.sale_timestamp ||
        editRow.sale_date;
      if (ts) {
        // Backend expects ISO datetime for parsing
        payload.sale_timestamp = typeof ts === 'string' ? ts : new Date(ts).toISOString();
      }
      const mid =
        form.menu_item_id ?? editRow.menu_item_id ?? editRow.menu_item_id ?? editRow.menu_itemId;
      if (mid !== undefined && mid !== null) payload.menu_item_id = Number(mid);

      await updateSaleRecord(editRow.sale_id || editRow.saleId || editRow.id, payload);
      setEditRow(null);
    } catch (e: any) {
      // Surface FastAPI validation errors (422) if present
      const serverDetail = e?.response?.data?.detail;
      if (serverDetail) {
        try {
          const msg = Array.isArray(serverDetail)
            ? serverDetail.map((d: any) => `${d.loc?.join?.('.') || d.loc}: ${d.msg}`).join('\n')
            : String(serverDetail);
          Alert.alert('Validation error', msg);
        } catch (_) {
          Alert.alert('Error', String(serverDetail));
        }
      } else {
        Alert.alert('Error', e.message || 'Failed to update');
      }
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Sales Explorer</Text>
      <DateSelector
        label="Range"
        startDate={new Date(startDate || new Date().toISOString().slice(0, 10))}
        endDate={new Date(endDate || new Date().toISOString().slice(0, 10))}
        onStartDateChange={d => setStartDate(d.toISOString().slice(0, 10))}
        onEndDateChange={d => setEndDate(d.toISOString().slice(0, 10))}
      />

      <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button mode="outlined" onPress={() => setMenuVisible(true)}>
          Menu Item
        </Button>
        <Text style={{ marginLeft: 8 }}>{menuItemId ? `Item: ${menuItemId}` : 'All Items'}</Text>
      </View>

  <Portal>
        {menuVisible && (
          <View
            style={{
              position: 'absolute',
              left: 20,
              right: 20,
              bottom: 200,
      backgroundColor: theme.colors.surface,
              borderRadius: 8,
              padding: 8,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setMenuItemId(null);
                setMenuVisible(false);
              }}
              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant as string }}
            >
              <Text>All Items</Text>
            </TouchableOpacity>
            {menuItems.map((mi: any) => (
              <TouchableOpacity
                key={mi.id || mi.menu_item_id}
                onPress={() => {
                  setMenuItemId(mi.id || mi.menu_item_id);
                  setMenuVisible(false);
                }}
                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant as string }}
              >
                <Text>{mi.name || mi.menu_item_name || String(mi.id)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setMenuVisible(false)}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: theme.colors.primary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Portal>

      {loading && <ActivityIndicator />}
  {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

      {!loading && !error && (
        <View style={{ backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12 }}>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Sales ({data.length})</Text>
          {data.length === 0 && (
            <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
              No records.
            </Text>
          )}

          {data.slice(0, 200).map((row: any, i: number) => (
            <TouchableOpacity
              key={i}
              onPress={() => setEditRow(row)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderBottomWidth: i === data.length - 1 ? 0 : 1,
                borderBottomColor: theme.colors.outlineVariant as string,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{row.menu_item_name || row.menu_item_id}</Text>
                <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
                  {new Date(
                    row.sale_timestamp || row.sale_date || row.sale_timestamp || ''
                  ).toLocaleString()}
                </Text>
              </View>
              <View style={{ width: 90, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>{row.quantity_sold}</Text>
                <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
                  {row.sales_channel}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={!!editRow} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: 16,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: theme.colors.surface,
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Edit Sale</Text>
            {form && (
              <>
                <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#888', marginBottom: 6 }}>
                  Item: {form.menu_item_name || form.menu_item_id}
                </Text>
                <TextInput
                  placeholder="Quantity"
                  value={String(form.quantity_sold)}
                  onChangeText={t => {
                    // allow only digits
                    const digits = t.replace(/[^0-9]/g, '');
                    setForm((f: any) => ({
                      ...f,
                      quantity_sold: digits === '' ? '' : Number(digits),
                    }));
                  }}
                  style={ti}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  onPress={() => {
                    // open animated menu (rendered inside modal)
                    setChannelMenuVisible(true);
                    menuScale.setValue(0.85);
                    menuOpacity.setValue(0);
                    Animated.parallel([
                      Animated.timing(menuScale, {
                        toValue: 1,
                        duration: 180,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                      }),
                      Animated.timing(menuOpacity, {
                        toValue: 1,
                        duration: 180,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                      }),
                    ]).start();
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: theme.colors.outline as string,
                    alignItems: 'center',
                  }}
                >
                  <Text>{form.sales_channel || 'Select Channel'}</Text>
                </TouchableOpacity>

                {channelMenuVisible && (
                  <Animated.View
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderRadius: 8,
                      marginTop: 8,
                      elevation: 6,
                      transform: [{ scale: menuScale }],
                      opacity: menuOpacity,
                    }}
                  >
                    {salesChannels.length === 0 && (
                      <TouchableOpacity
                        onPress={() => setChannelMenuVisible(false)}
                        style={{ padding: 12 }}
                      >
                        <Text style={{ color: (theme.colors.onSurfaceVariant as string) || '#888' }}>
                          No channels configured
                        </Text>
                      </TouchableOpacity>
                    )}
                    {salesChannels.map((ch: string) => (
                      <TouchableOpacity
                        key={ch}
                        onPress={() => {
                          Animated.parallel([
                            Animated.timing(menuScale, {
                              toValue: 0.85,
                              duration: 120,
                              easing: Easing.in(Easing.cubic),
                              useNativeDriver: true,
                            }),
                            Animated.timing(menuOpacity, {
                              toValue: 0,
                              duration: 120,
                              easing: Easing.in(Easing.cubic),
                              useNativeDriver: true,
                            }),
                          ]).start(() => {
                            setForm((f: any) => ({ ...f, sales_channel: ch }));
                            setChannelMenuVisible(false);
                          });
                        }}
                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant as string }}
                      >
                        <Text>{ch}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setChannelMenuVisible(false)}
                      style={{ padding: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: theme.colors.primary }}>Cancel</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setEditRow(null)}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: (theme.colors.surfaceVariant as string) || '#e5e7eb',
                      marginRight: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: theme.colors.onPrimary }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Portal-based simple channel picker so it sits above the modal */}
      {/* channel menu is rendered inside the modal card so it is interactive and not obscured */}
    </ScrollView>
  );
}

const ti = {
  borderWidth: 1,
  borderColor: '#d1d5db',
  padding: 8,
  borderRadius: 8,
  marginBottom: 8,
} as const;
