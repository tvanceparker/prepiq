import React, { useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput, Dialog, Portal } from 'react-native-paper';
import { useAccountSettings } from '../hooks/useAccountSettings';

export default function BasicAccountSettingsMobile() {
  const {
    accountInfo,
    loadingAccountInfo,
    errorAccountInfo,
    updateLoading,
    updateError,
    savePreferences,
    updateUserEmail,
    updateUserPhone,
    changeUserPassword,
  } = useAccountSettings();
  const [modalType, setModalType] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const openModal = (type: string) => {
    setModalType(type);
    if (type === 'preferences')
      setFormData({ auto_logout_minutes: accountInfo?.preferences?.auto_logout_minutes || 15 });
    if (type === 'email') setFormData({ currentPassword: '', newEmail: accountInfo?.email || '' });
    if (type === 'phone') setFormData({ currentPassword: '', newPhone: accountInfo?.phone || '' });
    if (type === 'password') setFormData({ currentPassword: '', newPassword: '' });
  };
  const closeModal = () => setModalType(null);

  const handleChange = (field: string, value: any) =>
    setFormData((s: any) => ({ ...s, [field]: value }));

  const handleSave = async () => {
    try {
      if (modalType === 'preferences') await savePreferences(formData);
      if (modalType === 'email') await updateUserEmail(formData);
      if (modalType === 'phone') await updateUserPhone(formData);
      if (modalType === 'password') await changeUserPassword(formData);
      closeModal();
    } catch (e) {
      // error surfaced via updateError state
    }
  };

  if (loadingAccountInfo)
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  if (errorAccountInfo)
    return (
      <View style={{ padding: 16 }}>
        <Text>Error loading account info</Text>
      </View>
    );
  if (!accountInfo) return null;

  const Row = ({ label, value, onEdit }: { label: string; value?: any; onEdit?: () => void }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', opacity: 0.7 }}>{label}</Text>
      <Text style={{ fontSize: 16, marginBottom: 4 }}>{value ?? '-'}</Text>
      {onEdit && (
        <Button mode="contained" compact onPress={onEdit}>
          Edit
        </Button>
      )}
    </View>
  );

  return (
    <View style={{ padding: 16 }}>
      <Text variant="titleLarge" style={{ marginBottom: 12 }}>
        Account
      </Text>
      <Row label="Name" value={accountInfo.name} />
      <Row label="Role" value={accountInfo.role || '-'} />
      <Row label="Email" value={accountInfo.email} onEdit={() => openModal('email')} />
      <Row label="Phone" value={accountInfo.phone || '-'} onEdit={() => openModal('phone')} />
      <Row label="Restaurant" value={accountInfo.restaurant_name || '-'} />
      <Row
        label="Restaurant location"
        value={
          accountInfo.restaurant_latitude
            ? `${accountInfo.restaurant_latitude}, ${accountInfo.restaurant_longitude}`
            : 'Not set'
        }
      />
      <Button style={{ marginTop: 8 }} mode="outlined" onPress={() => openModal('preferences')}>
        Preferences
      </Button>
      <Button style={{ marginTop: 8 }} mode="outlined" onPress={() => openModal('password')}>
        Change Password
      </Button>

      <Portal>
        <Dialog visible={!!modalType} onDismiss={closeModal}>
          <Dialog.Title>
            {modalType === 'preferences'
              ? 'Edit Preferences'
              : modalType === 'email'
                ? 'Change Email'
                : modalType === 'phone'
                  ? 'Change Phone'
                  : 'Change Password'}
          </Dialog.Title>
          <Dialog.Content>
            {modalType === 'preferences' && (
              <TextInput
                label="Auto Logout Minutes"
                keyboardType="numeric"
                value={String(formData.auto_logout_minutes || 15)}
                onChangeText={v => handleChange('auto_logout_minutes', parseInt(v || '0', 10))}
                style={{ marginBottom: 12 }}
              />
            )}
            {modalType === 'email' && (
              <>
                <TextInput
                  label="Current Password"
                  secureTextEntry
                  value={formData.currentPassword || ''}
                  onChangeText={v => handleChange('currentPassword', v)}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="New Email"
                  keyboardType="email-address"
                  value={formData.newEmail || ''}
                  onChangeText={v => handleChange('newEmail', v)}
                  style={{ marginBottom: 12 }}
                />
              </>
            )}
            {modalType === 'phone' && (
              <>
                <TextInput
                  label="Current Password"
                  secureTextEntry
                  value={formData.currentPassword || ''}
                  onChangeText={v => handleChange('currentPassword', v)}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="New Phone"
                  keyboardType="phone-pad"
                  value={formData.newPhone || ''}
                  onChangeText={v => handleChange('newPhone', v)}
                  style={{ marginBottom: 12 }}
                />
              </>
            )}
            {modalType === 'password' && (
              <>
                <TextInput
                  label="Current Password"
                  secureTextEntry
                  value={formData.currentPassword || ''}
                  onChangeText={v => handleChange('currentPassword', v)}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="New Password"
                  secureTextEntry
                  value={formData.newPassword || ''}
                  onChangeText={v => handleChange('newPassword', v)}
                  style={{ marginBottom: 12 }}
                />
              </>
            )}
            {updateError && (
              <Text style={{ color: 'red', marginTop: 4 }}>
                {(updateError as any).message || 'Error'}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeModal} disabled={updateLoading}>
              Cancel
            </Button>
            <Button onPress={handleSave} loading={updateLoading}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
