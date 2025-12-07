import React from 'react';
import { View, Text } from 'react-native';
import { Dialog, Portal, Button, TextInput, RadioButton } from 'react-native-paper';

type Props = {
  visible: boolean;
  formData: any | null;
  saving: boolean;
  onChange: (field: string, value: any) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  showInventoryMode?: boolean;
};

export default function BasicRestaurantSettingsModal({
  visible,
  formData,
  saving,
  onChange,
  onClose,
  onSave,
  showInventoryMode = true,
}: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose}>
        <Dialog.Title>Edit Restaurant Settings</Dialog.Title>
        <Dialog.Content>
          {formData && (
            <>
              <TextInput
                label="Forecast Length"
                keyboardType="numeric"
                value={String(formData.forecast_length)}
                onChangeText={v => onChange('forecast_length', parseInt(v || '0', 10))}
                style={{ marginBottom: 12 }}
              />
              <TextInput
                label="Timezone"
                value={formData.timezone || ''}
                onChangeText={v => onChange('timezone', v)}
                style={{ marginBottom: 12 }}
              />
              <TextInput
                label="EOD Run After Close (mins)"
                keyboardType="numeric"
                value={String(formData.eod_run_after_close_mins)}
                onChangeText={v => onChange('eod_run_after_close_mins', parseInt(v || '0', 10))}
                style={{ marginBottom: 12 }}
              />
              {showInventoryMode && (
                <>
                  <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                    Inventory Deduction Mode
                  </Text>
                  <RadioButton.Group
                    value={formData.inventory_deduction_mode || 'eod'}
                    onValueChange={value => onChange('inventory_deduction_mode', value)}
                  >
                    <RadioButton.Item label="End of Day (default)" value="eod" />
                    <RadioButton.Item label="Real-time (Pro/Master)" value="real_time" />
                  </RadioButton.Group>
                  <Text style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
                    Real-time mode deducts inventory for each completed order and fires alerts on
                    failure.
                  </Text>
                </>
              )}
              <Text style={{ fontWeight: '600', marginBottom: 4 }}>Sales Channels</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {(formData.sales_channels || []).map((ch: string, idx: number) => (
                  <TextInput
                    // Simple inline list via readonly inputs is clunky; chips are in parent view.
                    key={idx}
                    value={ch}
                    editable={false}
                    style={{ marginRight: 8, marginBottom: 8, width: 140 }}
                  />
                ))}
              </View>
              <TextInput
                label="New Channel"
                mode="outlined"
                onSubmitEditing={(e: any) => {
                  const val = (e.nativeEvent.text || '').trim();
                  if (val) onChange('sales_channels', [...(formData.sales_channels || []), val]);
                  e.currentTarget?.clear?.();
                }}
                placeholder="Type and press enter"
                style={{ marginBottom: 12 }}
              />
              <Text style={{ fontSize: 12, opacity: 0.6 }}>
                Latitude/Longitude not editable here.
              </Text>
            </>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onPress={onSave} loading={saving}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
