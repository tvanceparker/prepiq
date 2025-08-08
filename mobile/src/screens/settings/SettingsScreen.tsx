import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, List, useTheme, Divider } from 'react-native-paper';
import { useAuthStore } from '../../stores/authStore';
import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, restaurant, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  return (
    <ScreenLayout
      title="Settings & More"
      subtitle="Account settings and app preferences"
      icon="cog"
      iconColor={Colors.textSecondary}
    >
      {/* User Info */}
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Account Information
          </Text>
          <List.Item
            title={user?.username || 'Unknown User'}
            description={user?.email || 'No email'}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
          <List.Item
            title={restaurant?.name || 'No Restaurant'}
            description={user?.role || 'No role'}
            left={(props) => <List.Icon {...props} icon="store" />}
          />
        </Card.Content>
      </Card>

      {/* Settings Options */}
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Settings
          </Text>
          <List.Item
            title="Restaurant Settings"
            description="Manage restaurant information"
            left={(props) => <List.Icon {...props} icon="store-settings" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Account Settings"
            description="Update your account details"
            left={(props) => <List.Icon {...props} icon="account-settings" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Notifications"
            description="Manage notification preferences"
            left={(props) => <List.Icon {...props} icon="bell-settings" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Theme"
            description="App appearance settings"
            left={(props) => <List.Icon {...props} icon="palette" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Card.Content>
      </Card>

      {/* Support & Info */}
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Support & Information
          </Text>
          <List.Item
            title="Help & Support"
            description="Get help and contact support"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="About PrepIQ"
            description="App version and information"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          <Divider />
          <List.Item
            title="Privacy Policy"
            description="View our privacy policy"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </Card.Content>
      </Card>

      {/* Logout */}
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor={Colors.error}
            textColor="white"
            icon="logout"
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </Card.Content>
      </Card>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.sm,
  },
});