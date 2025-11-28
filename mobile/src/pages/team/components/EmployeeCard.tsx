// src/pages/team/components/EmployeeCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, Avatar, IconButton, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Employee } from '../../../interfaces/team';

interface EmployeeCardProps {
  employee: Employee;
  onEdit?: (employee: Employee) => void;
  getInitials?: (employee: Employee) => string;
  getRoleColor?: (role?: string) => string;
}

export function EmployeeCard({
  employee,
  onEdit,
  getInitials,
  getRoleColor,
}: EmployeeCardProps): React.JSX.Element {
  const theme = useTheme();
  const isActive = employee.is_active !== false;

  const defaultGetInitials = (emp: Employee) => {
    const parts = (emp.name || '').split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || '??';
  };

  const defaultGetRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'manager':
        return '#9c27b0';
      case 'chef':
      case 'cook':
        return '#ff9800';
      case 'server':
      case 'waiter':
        return '#2196f3';
      case 'cashier':
        return '#4caf50';
      default:
        return theme.colors.primary;
    }
  };

  const initials = getInitials ? getInitials(employee) : defaultGetInitials(employee);
  const roleColor = getRoleColor
    ? getRoleColor(employee.role_name)
    : defaultGetRoleColor(employee.role_name);

  return (
    <Card style={[styles.card, !isActive && styles.inactiveCard]} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Avatar.Text size={48} label={initials} style={{ backgroundColor: roleColor }} />

        <View style={styles.employeeInfo}>
          <View style={styles.nameRow}>
            <Text variant="titleMedium" style={styles.employeeName}>
              {employee.name}
            </Text>
            {!isActive && (
              <Chip compact style={styles.inactiveChip} textStyle={{ fontSize: 10, color: '#fff' }}>
                Inactive
              </Chip>
            )}
          </View>

          {employee.role_name && (
            <Chip
              compact
              style={[styles.roleChip, { backgroundColor: roleColor }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              {employee.role_name}
            </Chip>
          )}

          <View style={styles.contactInfo}>
            {employee.email && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons
                  name="email"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={styles.contactText} numberOfLines={1}>
                  {employee.email}
                </Text>
              </View>
            )}
            {employee.phone && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons
                  name="phone"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={styles.contactText}>
                  {employee.phone}
                </Text>
              </View>
            )}
            {employee.hourly_rate && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={styles.contactText}>
                  ${employee.hourly_rate.toFixed(2)}/hr
                </Text>
              </View>
            )}
          </View>
        </View>

        {onEdit && <IconButton icon="pencil" size={20} onPress={() => onEdit(employee)} />}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontWeight: '600',
  },
  inactiveChip: {
    height: 20,
    backgroundColor: '#9e9e9e',
  },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 22,
  },
  contactInfo: {
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    marginLeft: 4,
    color: '#666',
  },
});

export default EmployeeCard;
