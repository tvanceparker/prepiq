import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Portal, Text, TextInput, Chip } from 'react-native-paper';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';

export default function BasicRestaurantSettingsMobile() {
  const { settings, loading, error, saveSettings, saving } = useRestaurantSettings();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState<any|null>(null);

  useEffect(()=> {
    if (settings && visible && !formData) setFormData(settings);
  }, [settings, visible, formData]);

  const open = () => { setFormData(settings||null); setVisible(true); };
  const close = () => { setVisible(false); };
  const updateField = (field:string, value:any) => setFormData((s:any)=> ({ ...(s||{}), [field]: value }));

  const handleSave = async () => {
    try { await saveSettings(formData); close(); } catch(e) { close(); }
  };

  if (loading) return <View style={{ padding:16, alignItems:'center' }}><ActivityIndicator /></View>;
  if (error) return <View style={{ padding:16 }}><Text>Error loading settings</Text></View>;
  if (!settings) return null;

  return (
    <View style={{ padding:16 }}>
      <Text variant="titleLarge" style={{ marginBottom:12 }}>Restaurant Settings</Text>
      <Text style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>Forecast Length:</Text> {settings.forecast_length} days</Text>
      <Text style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>Timezone:</Text> {settings.timezone || 'N/A'}</Text>
      <Text style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>Run EOD When Closed:</Text> {settings.eod_run_when_closed ? 'Yes':'No'}</Text>
      <Text style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>EOD Buffer Time:</Text> {settings.eod_run_after_close_mins} mins</Text>
      <Text style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>Sales Channels:</Text> {(settings.sales_channels?.length? settings.sales_channels.join(', '): 'None')}</Text>
      <Text style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>Location:</Text> {settings.latitude ? `${settings.latitude}, ${settings.longitude}`: 'Not set'}</Text>
      <Button style={{ marginTop:12 }} mode="contained" onPress={open}>Edit</Button>

      <Portal>
        <Dialog visible={visible} onDismiss={close}>
          <Dialog.Title>Edit Restaurant Settings</Dialog.Title>
          <Dialog.Content>
            {formData && (
              <>
                <TextInput label="Forecast Length" keyboardType="numeric" value={String(formData.forecast_length)} onChangeText={v=>updateField('forecast_length', parseInt(v||'0',10))} style={{ marginBottom:12 }} />
                <TextInput label="Timezone" value={formData.timezone||''} onChangeText={v=>updateField('timezone', v)} style={{ marginBottom:12 }} />
                <TextInput label="EOD Run After Close (mins)" keyboardType="numeric" value={String(formData.eod_run_after_close_mins)} onChangeText={v=>updateField('eod_run_after_close_mins', parseInt(v||'0',10))} style={{ marginBottom:12 }} />
                <Text style={{ fontWeight:'600', marginBottom:4 }}>Sales Channels</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:8 }}>
                  {(formData.sales_channels||[]).map((ch:string, idx:number)=>(
                    <Chip key={idx} onClose={()=>updateField('sales_channels', (formData.sales_channels||[]).filter((c:string)=>c!==ch))} style={{ margin:2 }}>{ch}</Chip>
                  ))}
                </View>
                <TextInput label="Add Channel" value={''} onChangeText={()=>{}} placeholder="Use + below" style={{ display:'none' }} />
                {/* Simple quick add text input */}
                <TextInput label="New Channel" mode="outlined" onSubmitEditing={(e:any)=> { const val=e.nativeEvent.text.trim(); if (val) updateField('sales_channels', [ ...(formData.sales_channels||[]), val ]); }} placeholder="Type and press enter" style={{ marginBottom:12 }} />
                <Text style={{ fontSize:12, opacity:0.6 }}>Latitude/Longitude not editable here.</Text>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={close} disabled={saving}>Cancel</Button>
            <Button onPress={handleSave} loading={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
