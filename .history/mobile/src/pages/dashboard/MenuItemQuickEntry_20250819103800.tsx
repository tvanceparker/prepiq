import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useMenuItems } from './hooks/useMenuItems';

// Simple pill button component
function Pill({ active, label, onPress }:{ active:boolean; label:string; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:50, marginRight:8, marginBottom:8, backgroundColor: active? '#2563eb':'#e5e7eb' }}>
      <Text style={{ fontSize:12, color: active? 'white':'#111827' }}>{label}</Text>
    </TouchableOpacity>
  );
}

interface MenuItemForm { name:string; category:string; price:number; is_active?:boolean }

export default function MenuItemQuickEntry() {
  const { menuItems, loading, handleCreateMenuItem, handleUpdateMenuItem, handleDeleteMenuItem } = useMenuItems();

  const categoryItems = useMemo(()=> {
    const cats = new Set<string>(menuItems.map(i=> i.category));
    return Array.from(cats);
  },[menuItems]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryItems);
  useEffect(()=> { setSelectedCategories(categoryItems); },[categoryItems]);

  const [statusFilter,setStatusFilter] = useState<'active'|'inactive'|'all'>('active');

  const filtered = useMemo(()=> menuItems.filter(mi => {
    if (selectedCategories.length>0 && !selectedCategories.includes(mi.category)) return false;
    if (statusFilter!=='all') {
      if (statusFilter==='active' && !mi.is_active) return false;
      if (statusFilter==='inactive' && mi.is_active) return false;
    }
    return true;
  }),[menuItems, selectedCategories, statusFilter]);

  // lightweight add form
  const [form, setForm] = useState<MenuItemForm>({ name:'', category:'', price:0, is_active:true });
  const onChange = (k:keyof MenuItemForm, v:any)=> setForm(f=> ({ ...f, [k]: v }));

  const submit = async () => {
    try {
      await handleCreateMenuItem({ name: form.name, category: form.category, price: form.price, is_active: form.is_active });
      setForm({ name:'', category:'', price:0, is_active:true });
    } catch(e:any){ Alert.alert('Error', e.message || 'Failed to add menu item'); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Menu Item Quick Entry</Text>
      {/* Filters */}
      <View style={{ marginBottom:16 }}>
        <Text style={{ fontWeight:'600', marginBottom:6 }}>Categories</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
          <Pill label='All' active={selectedCategories.length===categoryItems.length} onPress={()=> setSelectedCategories(categoryItems)} />
          {categoryItems.map(cat=> <Pill key={cat} label={cat} active={selectedCategories.includes(cat)} onPress={()=> setSelectedCategories(prev=> prev.includes(cat)? prev.filter(c=> c!==cat): [...prev, cat])} />)}
        </View>
        <Text style={{ fontWeight:'600', marginVertical:6 }}>Status</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
          {['active','inactive','all'].map(s=> <Pill key={s} label={s} active={statusFilter===s} onPress={()=> setStatusFilter(s as any)} />)}
        </View>
      </View>

      {/* Add Form */}
      <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16, elevation:2 }}>
        <Text style={{ fontWeight:'600', marginBottom:8 }}>Add Menu Item</Text>
        <TextInput placeholder='Name' value={form.name} onChangeText={t=> onChange('name', t)} style={tiStyle} />
        <TextInput placeholder='Category' value={form.category} onChangeText={t=> onChange('category', t)} style={tiStyle} />
        <TextInput placeholder='Price' value={form.price? String(form.price):''} onChangeText={t=> onChange('price', parseFloat(t)||0)} keyboardType='numeric' style={tiStyle} />
        <TouchableOpacity onPress={submit} style={{ backgroundColor:'#2563eb', padding:12, borderRadius:8, alignItems:'center', marginTop:4 }}>
          <Text style={{ color:'white', fontWeight:'600' }}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Items list */}
      {loading ? <ActivityIndicator style={{ marginTop:20 }} /> : (
        <View>
          {filtered.map(mi => <MenuItemRow key={mi.menu_item_id} item={mi} onDelete={handleDeleteMenuItem} onUpdate={handleUpdateMenuItem} />)}
          {filtered.length===0 && <Text style={{ color:'#666', fontSize:12 }}>No items match filters.</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function MenuItemRow({ item, onDelete, onUpdate }:{ item:any; onDelete:(id:number)=>void; onUpdate:(id:number, data:any)=>void }) {
  const [editing,setEditing] = useState(false);
  const [draft,setDraft] = useState({ name:item.name, category:item.category, price:item.price, is_active:item.is_active });
  const save = async () => { await onUpdate(item.menu_item_id, draft); setEditing(false); };
  return (
    <View style={{ padding:12, borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, marginBottom:8, backgroundColor:'white' }}>
      {editing ? (
        <>
          <TextInput style={tiStyle} value={draft.name} onChangeText={t=> setDraft(d=> ({ ...d, name:t }))} />
          <TextInput style={tiStyle} value={draft.category} onChangeText={t=> setDraft(d=> ({ ...d, category:t }))} />
          <TextInput style={tiStyle} value={String(draft.price)} onChangeText={t=> setDraft(d=> ({ ...d, price: parseFloat(t)||0 }))} keyboardType='numeric' />
          <View style={{ flexDirection:'row', marginTop:4 }}>
            <TouchableOpacity onPress={save} style={smallBtn('#16a34a')}><Text style={{ color:'white' }}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=> setEditing(false)} style={smallBtn('#6b7280')}><Text style={{ color:'white' }}>Cancel</Text></TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={{ fontWeight:'600' }}>{item.name}</Text>
          <Text style={{ fontSize:12, color:'#555' }}>{item.category} • ${item.price?.toFixed?.(2) ?? '0.00'}</Text>
          <View style={{ flexDirection:'row', marginTop:6 }}>
            <TouchableOpacity onPress={()=> setEditing(true)} style={smallBtn('#2563eb')}><Text style={{ color:'white' }}>Edit</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=> onDelete(item.menu_item_id)} style={smallBtn('#dc2626')}><Text style={{ color:'white' }}>Delete</Text></TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const tiStyle = { borderWidth:1, borderColor:'#d1d5db', padding:8, borderRadius:8, marginBottom:8 } as const;
const smallBtn = (bg:string)=> ({ backgroundColor:bg, paddingVertical:6, paddingHorizontal:12, borderRadius:6, marginRight:8, alignItems:'center' });
