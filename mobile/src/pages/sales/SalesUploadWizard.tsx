import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  Appbar,
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import DateSelector from '../../components/DateSelector';
import { getMenuItems, uploadSalesManual, checkSalesExist } from '../../api/dashboard';
import { getRestaurantSettings } from '../../api/settings';

type Mode = 'byChannel' | 'byItem';

interface MenuItemLite {
  menu_item_id: number;
  name: string;
}

export default function SalesUploadWizard({ navigation }: any) {
  const theme = useTheme();
  const [step, setStep] = useState<number>(1);
  const [mode, setMode] = useState<Mode>('byChannel');
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItemLite[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [filter, setFilter] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, number>>({});

  // entries[(itemId, channel)] = qty
  const [entries, setEntries] = useState<Record<string, number>>({});
  const entryKey = (itemId: number, channel: string) => `${itemId}||${channel}`;

  useEffect(() => {
    const load = async () => {
      try {
        const [menu, settings] = await Promise.all([
          getMenuItems() as any,
          getRestaurantSettings() as any,
        ]);
        setItems((menu || []).map((i: any) => ({ menu_item_id: i.menu_item_id, name: i.name })));
        const ch = (settings?.sales_channels as string[]) || [];
        setChannels(ch);
      } catch (e: any) {
        setSnackbar({ visible: true, message: `Failed to load settings/menu: ${e?.message || e}` });
      }
    };
    load();
  }, []);

  const modeTargets = useMemo(() => {
    return mode === 'byChannel' ? selectedChannels : selectedItems;
  }, [mode, selectedChannels, selectedItems]);

  const currentLabel = useMemo(() => {
    if (mode === 'byChannel') return selectedChannels[currentIndex] || '';
    const id = selectedItems[currentIndex];
    const it = items.find(i => i.menu_item_id === id);
    return it?.name || '';
  }, [mode, selectedChannels, selectedItems, currentIndex, items]);

  const visibleItems = useMemo(() => {
    const base = items;
    if (!filter) return base;
    const f = filter.toLowerCase();
    return base.filter(
      i => i.name.toLowerCase().includes(f) || String(i.menu_item_id).includes(filter)
    );
  }, [items, filter]);

  const updateQty = (itemId: number, channel: string, value: string) => {
    const v = Math.max(0, parseInt(value.replace(/[^0-9]/g, '') || '0', 10));
    setEntries(prev => ({ ...prev, [entryKey(itemId, channel)]: v }));
  };

  const getQty = (itemId: number, channel: string) => entries[entryKey(itemId, channel)] || 0;

  const goNext = () => {
    if (currentIndex < modeTargets.length - 1) setCurrentIndex(currentIndex + 1);
    else setStep(3);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const canContinueFromStep1 = useMemo(() => {
    if (!saleDate) return false;
    if (mode === 'byChannel') return selectedChannels.length > 0;
    return selectedItems.length > 0;
  }, [saleDate, mode, selectedChannels, selectedItems]);

  const onContinueStep1 = () => {
    if (!canContinueFromStep1) return;
    setCurrentIndex(0);
    setStep(2);
  };

  const nonZeroEntries = useMemo(() => {
    const result: Array<{ item_id: number; item_name: string; channel: string; qty: number }> = [];
    Object.entries(entries).forEach(([k, qty]) => {
      if (!qty || qty <= 0) return;
      const [idStr, ch] = k.split('||');
      const id = Number(idStr);
      const item = items.find(i => i.menu_item_id === id);
      if (!item) return;
      result.push({ item_id: id, item_name: item?.name || String(id), channel: ch, qty });
    });
    return result;
  }, [entries, items]);

  const submitAll = async (confirmOverwrite: boolean) => {
    const sale_date = saleDate.toISOString().slice(0, 10);
    const payloadEntries = nonZeroEntries.map(e => ({
      menu_item_id: e.item_id,
      quantity_sold: e.qty,
      sales_channel: e.channel,
    }));
    if (payloadEntries.length === 0) {
      setSnackbar({ visible: true, message: 'Please enter at least one quantity.' });
      return;
    }
    try {
      if (!confirmOverwrite) {
        // check conflicts by channels present
        const channels = Array.from(new Set(payloadEntries.map(e => e.sales_channel)));
        const result = await checkSalesExist(sale_date, channels as any);
        const confRaw = (result && result.conflicts) || {};
        const conf: Record<string, number> = {};
        Object.entries(confRaw).forEach(([k, v]) => {
          conf[String(k)] = Number(v as any) || 0;
        });
        if (Object.keys(conf).length) {
          setConflicts(conf);
          setConfirmVisible(true);
          return;
        }
      }
      await uploadSalesManual({
        sale_date,
        overwrite: !!confirmOverwrite,
        entries: payloadEntries,
      });
      setSnackbar({
        visible: true,
        message: confirmOverwrite ? 'Sales overwritten' : 'Sales uploaded',
      });
      navigation.goBack();
    } catch (e: any) {
      setSnackbar({ visible: true, message: String(e?.message || e) });
    }
  };

  const Header = (
    <Appbar.Header>
      <Appbar.BackAction onPress={() => navigation.goBack()} />
      <Appbar.Content title="Sales Upload" subtitle={`Step ${step} of 3`} />
    </Appbar.Header>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {Header}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {step === 1 && (
          <View>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              Choose how you want to enter sales
            </Text>
            <RadioButton.Group onValueChange={v => setMode(v as Mode)} value={mode}>
              <RadioButton.Item label="By Sales Channel (then pick items)" value="byChannel" />
              <RadioButton.Item label="By Menu Item (then enter per-channel)" value="byItem" />
            </RadioButton.Group>
            <Divider style={{ marginVertical: 12 }} />
            <DateSelector
              label="Sale date"
              startDate={saleDate}
              endDate={saleDate}
              onStartDateChange={setSaleDate}
              onEndDateChange={setSaleDate}
              mode="single"
            />
            <Divider style={{ marginVertical: 12 }} />
            {mode === 'byChannel' ? (
              <View>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                  Select one or more sales channels
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {channels.map(ch => {
                    const selected = selectedChannels.includes(ch);
                    return (
                      <Chip
                        key={ch}
                        selected={selected}
                        onPress={() =>
                          setSelectedChannels(prev =>
                            selected ? prev.filter(c => c !== ch) : [...prev, ch]
                          )
                        }
                        style={{ marginRight: 6, marginBottom: 6 }}
                      >
                        {ch}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                  Pick the menu items you want to fill
                </Text>
                <TextInput
                  mode="outlined"
                  label="Filter items"
                  value={filter}
                  onChangeText={setFilter}
                  style={{ marginBottom: 8 }}
                />
                <View>
                  {visibleItems.map(it => {
                    const selected = selectedItems.includes(it.menu_item_id);
                    return (
                      <Chip
                        key={it.menu_item_id}
                        selected={selected}
                        onPress={() =>
                          setSelectedItems(prev =>
                            selected
                              ? prev.filter(id => id !== it.menu_item_id)
                              : [...prev, it.menu_item_id]
                          )
                        }
                        style={{ marginRight: 6, marginBottom: 6 }}
                      >
                        {it.name}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            )}
            <View style={{ height: 16 }} />
            <Button mode="contained" disabled={!canContinueFromStep1} onPress={onContinueStep1}>
              Continue
            </Button>
          </View>
        )}

        {step === 2 && (
          <View>
            {mode === 'byChannel' ? (
              <View>
                <Text variant="titleMedium" style={{ marginBottom: 4 }}>
                  Channel: {currentLabel}
                </Text>
                <TextInput
                  mode="outlined"
                  label="Filter items"
                  value={filter}
                  onChangeText={setFilter}
                  style={{ marginBottom: 8 }}
                />
                {visibleItems.map(it => (
                  <View
                    key={it.menu_item_id}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                  >
                    <Text style={{ flex: 1 }}>{it.name}</Text>
                    <TextInput
                      mode="outlined"
                      dense
                      keyboardType="numeric"
                      value={String(getQty(it.menu_item_id, currentLabel) || '')}
                      onChangeText={v => updateQty(it.menu_item_id, currentLabel, v)}
                      style={{ width: 100 }}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View>
                <Text variant="titleMedium" style={{ marginBottom: 4 }}>
                  Item: {currentLabel}
                </Text>
                <View>
                  {channels.map(ch => (
                    <View
                      key={ch}
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    >
                      <Text style={{ flex: 1 }}>{ch}</Text>
                      <TextInput
                        mode="outlined"
                        dense
                        keyboardType="numeric"
                        value={String(getQty(selectedItems[currentIndex], ch) || '')}
                        onChangeText={v => updateQty(selectedItems[currentIndex], ch, v)}
                        style={{ width: 100 }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button mode="text" onPress={() => setStep(1)}>
                Back to selection
              </Button>
              <View style={{ flexDirection: 'row' }}>
                <Button
                  mode="outlined"
                  onPress={goPrev}
                  disabled={currentIndex === 0}
                  style={{ marginRight: 8 }}
                >
                  Previous
                </Button>
                <Button mode="contained" onPress={goNext}>
                  {currentIndex === modeTargets.length - 1 ? 'Review' : 'Next'}
                </Button>
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              Review
            </Text>
            <Text>Date: {saleDate.toISOString().slice(0, 10)}</Text>
            <Divider style={{ marginVertical: 8 }} />
            {nonZeroEntries.length === 0 ? (
              <Text style={{ color: (theme.colors.onSurfaceVariant as any) || '#777' }}>
                No quantities entered.
              </Text>
            ) : (
              nonZeroEntries.map(e => (
                <View
                  key={`${e.item_id}-${e.channel}`}
                  style={{ flexDirection: 'row', marginBottom: 6 }}
                >
                  <Text style={{ flex: 2 }}>{e.item_name}</Text>
                  <Text style={{ flex: 1 }}>{e.channel}</Text>
                  <Text style={{ width: 60, textAlign: 'right' }}>{e.qty}</Text>
                </View>
              ))
            )}
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button mode="text" onPress={() => setStep(2)}>
                Back
              </Button>
              <Button
                mode="contained"
                onPress={() => submitAll(false)}
                disabled={nonZeroEntries.length === 0}
              >
                Submit
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Overwrite existing sales?</Dialog.Title>
          <Dialog.Content>
            <Text>We found existing sales for this date in these channels:</Text>
            {Object.entries(conflicts).map(([ch, cnt]) => (
              <Text key={ch}>
                {ch} — {String(cnt)}
              </Text>
            ))}
            <Text style={{ marginTop: 8 }}>Proceed to overwrite those channels?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button
              onPress={() => {
                setConfirmVisible(false);
                submitAll(true);
              }}
            >
              Overwrite
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
