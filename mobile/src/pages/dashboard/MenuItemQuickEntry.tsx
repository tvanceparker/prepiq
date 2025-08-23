import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useMenuItems, MobileMenuItem } from './hooks/useMenuItems';
import { useTheme, Snackbar, TextInput as PaperTextInput } from 'react-native-paper';

function Pill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 50,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: active
          ? (theme.colors.primary as string)
          : (theme.colors.surfaceVariant as string) || '#e5e7eb',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          color: active ? (theme.colors.onPrimary as string) : (theme.colors.onSurface as string),
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface MenuItemForm {
  name: string;
  category?: string | null;
  price: string; // store as string while editing to allow entering decimals
  is_active?: boolean;
}

export default function MenuItemQuickEntry() {
  const theme = useTheme();
  const { menuItems, loading, handleCreateMenuItem, handleUpdateMenuItem, handleDeleteMenuItem } =
    useMenuItems();

  const categoryItems = useMemo(
    () => Array.from(new Set(menuItems.map(i => i.category).filter(Boolean))) as string[],
    [menuItems]
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  useEffect(() => setSelectedCategories(categoryItems), [categoryItems]);

  const [statusFilter, setStatusFilter] = useState<'Active' | 'Inactive' | 'All'>('Active');
  const filtered = useMemo(
    () =>
      menuItems.filter(mi => {
        if (
          selectedCategories.length > 0 &&
          !(mi.category && selectedCategories.includes(mi.category))
        )
          return false;
        if (statusFilter !== 'All') {
          if (statusFilter === 'Active' && !mi.is_active) return false;
          if (statusFilter === 'Inactive' && mi.is_active) return false;
        }
        return true;
      }),
    [menuItems, selectedCategories, statusFilter]
  );

  const [createVisible, setCreateVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MobileMenuItem | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    category?: string | null;
    price: string;
  }>({ name: '', category: '', price: '' });

  const overlayAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const to = createVisible || !!editingItem ? 1 : 0;
    Animated.timing(overlayAnim, { toValue: to, duration: 200, useNativeDriver: true }).start();
  }, [createVisible, editingItem, overlayAnim]);

  const openEdit = (item: MobileMenuItem) => {
    setEditingItem(item);
    setEditDraft({
      name: item.name,
      category: item.category ?? '',
      price: String(item.price ?? ''),
    });
  };

  const [form, setForm] = useState<MenuItemForm>({
    name: '',
    category: '',
    price: '',
    is_active: true,
  });
  const onChange = (k: keyof MenuItemForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const showSnack = (msg: string) => {
    setSnackMessage(msg);
    setSnackVisible(true);
  };

  const submit = async () => {
    if (!form.name || !form.name.trim()) return showSnack('Name is required');
    const parsedPrice = parseFloat(String(form.price));
    if (isNaN(parsedPrice)) return showSnack('Enter a valid price');
    try {
      await handleCreateMenuItem({
        name: form.name.trim(),
        category: form.category ?? null,
        price: parsedPrice,
        is_active: !!form.is_active,
      });
      setForm({ name: '', category: '', price: '', is_active: true });
      setCreateVisible(false);
      showSnack('Menu item added');
    } catch (e: any) {
      showSnack(e?.message || 'Failed to add');
    }
  };

  const onDelete = async (id: number) => {
    try {
      await handleDeleteMenuItem(id);
      showSnack('Menu item deleted');
      setEditingItem(null);
    } catch (e: any) {
      showSnack(e?.message || 'Failed to delete');
    }
  };

  const onUpdate = async (id: number, data: any) => {
    try {
      await handleUpdateMenuItem(id, data);
      showSnack('Saved');
    } catch (e: any) {
      showSnack(e?.message || 'Failed to save');
    }
  };

  const windowWidth = Dimensions.get('window').width;
  const cardWidth = Math.floor((windowWidth - 56) / 2);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
          Menu Item Quick Entry
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Pill
              label="All"
              active={selectedCategories.length === categoryItems.length}
              onPress={() => setSelectedCategories(categoryItems)}
            />
            {categoryItems.map(cat => (
              <Pill
                key={cat}
                label={cat}
                active={selectedCategories.includes(cat)}
                onPress={() =>
                  setSelectedCategories(prev =>
                    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                  )
                }
              />
            ))}
          </View>

          <Text style={{ fontWeight: '600', marginVertical: 6 }}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(['Active', 'Inactive', 'All'] as const).map(s => (
              <Pill
                key={s}
                label={s}
                active={statusFilter === s}
                onPress={() => setStatusFilter(s)}
              />
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : filtered.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={{ color: (theme.colors.onSurfaceVariant as string) || '#888', fontSize: 12 }}
          >
            No items match filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.menu_item_id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 160, paddingTop: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} style={{ width: cardWidth }}>
              <MenuItemCard item={item} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Dim overlay */}
      <Animated.View
        pointerEvents={createVisible || !!editingItem ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity: overlayAnim,
          zIndex: 40,
        }}
      />

      {/* FAB - ensure on top */}
      <TouchableOpacity
        onPress={() => setCreateVisible(true)}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 24,
          backgroundColor: theme.colors.primary,
          padding: 14,
          borderRadius: 30,
          elevation: 20,
          zIndex: 50,
        }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>＋</Text>
      </TouchableOpacity>

      {/* Create modal - anchored bottom */}
      <Modal
        visible={createVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              padding: 16,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Add Menu Item</Text>
            <TextInput
              placeholder="Name"
              value={form.name}
              onChangeText={t => onChange('name', t)}
              style={tiStyle}
            />
            <TextInput
              placeholder="Category"
              value={form.category ?? ''}
              onChangeText={t => onChange('category', t)}
              style={tiStyle}
            />
            <TextInput
              placeholder="Price"
              value={form.price ? String(form.price) : ''}
              onChangeText={t => onChange('price', parseFloat(t) || 0)}
              keyboardType="numeric"
              style={tiStyle}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setCreateVisible(false)}
                style={smallBtn(theme.colors.surfaceVariant as string)}
              >
                <Text style={{ color: theme.colors.onSurface }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} style={smallBtn(theme.colors.primary as string)}>
                <Text style={{ color: theme.colors.onPrimary }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit modal - bottom anchored for parity */}
      <Modal
        visible={!!editingItem}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              padding: 16,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Edit Item</Text>
            <TextInput
              value={editDraft.name}
              onChangeText={t => setEditDraft(d => ({ ...d, name: t }))}
              style={tiStyle}
            />
            <TextInput
              value={editDraft.category ?? ''}
              onChangeText={t => setEditDraft(d => ({ ...d, category: t }))}
              style={tiStyle}
            />
            <PaperTextInput
              label="Price"
              value={String(editDraft.price)}
              onChangeText={t => setEditDraft(d => ({ ...d, price: t }))}
              keyboardType="numeric"
              mode="flat"
              style={tiStyle}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity
                onPress={async () => editingItem && (await onDelete(editingItem.menu_item_id))}
                style={smallBtn(theme.colors.error as string)}
              >
                <Text style={{ color: theme.colors.onError }}>Delete</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={() => setEditingItem(null)}
                  style={smallBtn(theme.colors.surfaceVariant as string)}
                >
                  <Text style={{ color: theme.colors.onSurface }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!editingItem) return;
                    await onUpdate(editingItem.menu_item_id, editDraft);
                    setEditingItem(null);
                  }}
                  style={smallBtn(theme.colors.primary as string)}
                >
                  <Text style={{ color: theme.colors.onPrimary }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2500}
        action={{ label: 'OK', onPress: () => setSnackVisible(false) }}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
}

function MenuItemCard({ item }: { item: MobileMenuItem }) {
  const theme = useTheme();
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant as string,
        marginRight: 8,
      }}
    >
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>{item.name}</Text>
      <Text style={{ fontSize: 12, color: (theme.colors.onSurfaceVariant as string) || '#666' }}>
        {item.category}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '600', marginTop: 8 }}>
        ${item.price?.toFixed?.(2) ?? '0.00'}
      </Text>
      <Text style={{ fontSize: 11, color: item.is_active ? 'green' : 'red', marginTop: 6 }}>
        {item.is_active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

const tiStyle = {
  borderWidth: 1,
  borderColor: '#d1d5db',
  padding: 8,
  borderRadius: 8,
  marginBottom: 8,
} as const;
const smallBtn = (bg: string) => ({
  backgroundColor: bg,
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 6,
  marginRight: 8,
  alignItems: 'center' as const,
});
