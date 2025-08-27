import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Card,
  Chip,
  Divider,
  List,
  Button as PaperButton,
  Snackbar,
  useTheme,
  Avatar,
} from 'react-native-paper';
import useTenantInfo from '../hooks/useTenantInfo';
import type { TenantInfoResponse, TenantInfoUpdateRequest } from '../../../interfaces/admin';
import TenantModal from './TenantModal';

export default function TenantInfoBasic() {
  const theme = useTheme();
  const { info, loading, error, saveTenantInfo, refetch, isFetching } = useTenantInfo();
  const [showModal, setShowModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: '', type: 'success' });

  const handleSave = async (data: TenantInfoUpdateRequest) => {
    try {
      await saveTenantInfo(data);
      setShowModal(false);
      setSnackbar({ visible: true, message: 'Tenant Info updated successfully', type: 'success' });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to update Tenant Info',
        type: 'error',
      });
    }
  };

  const formatAddress = (info: TenantInfoResponse) => {
    const parts = [info.address, info.city, info.state, info.zip_code].filter(Boolean);
    return parts.join(', ');
  };

  if (loading)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading tenant info…</Text>
      </View>
    );
  if (error)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ marginBottom: 12 }}>Error loading tenant info</Text>
        <PaperButton mode="contained" onPress={() => refetch()}>Retry</PaperButton>
      </View>
    );
  if (!info) return <Text style={styles.center}>No tenant info.</Text>;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={!!isFetching} onRefresh={() => refetch()} />}
    >
      <Card style={styles.hero}>
  <Card.Title
          title={info.name}
          subtitle={info.email}
          left={props => <Avatar.Icon {...props} icon="account" />}
          right={() => (
            <Chip
              icon={info.subscription_status === 'active' ? 'check-circle' : 'alert'}
              style={{ backgroundColor: theme.colors.elevation.level2 }}
            >
              {info.subscription_tier.toUpperCase()}
            </Chip>
          )}
        />
        {info.expiry_date && (
          <Card.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Expires: {new Date(info.expiry_date).toLocaleDateString()}
            </Text>
          </Card.Content>
        )}
        <Card.Actions>
          <PaperButton mode="contained" onPress={() => setShowModal(true)} icon="pencil">
            Edit Info
          </PaperButton>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Contact" left={props => <Avatar.Icon {...props} icon="phone" />} />
        <Divider />
        <List.Item
          title={info.phone || '-'}
          left={p => <List.Icon {...p} icon="phone" />}
          right={() => null}
        />
        <List.Item
          title={info.email}
          left={p => <List.Icon {...p} icon="email" />}
          right={() => null}
        />
        <List.Item
          title={formatAddress(info) || '-'}
          left={p => <List.Icon {...p} icon="map-marker" />}
          right={() => null}
        />
      </Card>

      <Card style={styles.card}>
        <Card.Title
          title="Business Hours"
          left={props => <Avatar.Icon {...props} icon="clock" />}
        />
        <Divider />
        <Card.Content>
          {(info.hours_of_operation || []).map(({ day, is_closed, open_time, close_time }) => (
            <View key={day} style={styles.hoursRow}>
              <Text style={[styles.hoursDay, { color: theme.colors.onSurface }]}>{day}</Text>
              <Text style={[styles.hoursTime, { color: theme.colors.onSurfaceVariant }]}>
                {is_closed ? 'Closed' : `${open_time || '--:--'} - ${close_time || '--:--'}`}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Note: Subscription status changes are managed in account/billing settings.
          </Text>
        </Card.Content>
      </Card>

      {showModal && (
        <TenantModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          initialData={info}
        />
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(s => ({ ...s, visible: false }))}
        duration={2500}
        style={{
          backgroundColor: snackbar.type === 'error' ? theme.colors.error : theme.colors.primary,
        }}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  hero: { marginBottom: 8 },
  card: { marginBottom: 8 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  hoursDay: { fontWeight: '600' },
  hoursTime: {},
  center: { textAlign: 'center', marginTop: 40 },
});
