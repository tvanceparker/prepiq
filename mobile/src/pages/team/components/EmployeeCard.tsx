import React from 'react';
import { Avatar, Button, Card, Text } from 'react-native-paper';
import type { Employee } from '../../../interfaces/team';
type Props = { employee: Employee; onEdit: (employee: Employee) => void; getInitials: (employee: Employee) => string; getRoleColor: (role: string) => string };
export function EmployeeCard({ employee, onEdit, getInitials }: Props) {
  return <Card mode="outlined"><Card.Title title={employee.name} subtitle={employee.role_name || 'Employee'} left={() => <Avatar.Text size={40} label={getInitials(employee)} />} /><Card.Content><Text>{employee.email}</Text><Text>{employee.is_active ? 'Active' : 'Inactive'}</Text></Card.Content><Card.Actions><Button onPress={() => onEdit(employee)}>Edit</Button></Card.Actions></Card>;
}
