import React from 'react';
import { Button, Card, Text } from 'react-native-paper';
import type { ShiftSchedule } from '../../../interfaces/team';
type Props = { shift: ShiftSchedule; employeeName: string; onEdit: (shift: ShiftSchedule) => void; onDelete: (id: number) => void };
export function ShiftCard({ shift, employeeName, onEdit, onDelete }: Props) {
  return <Card mode="outlined"><Card.Title title={employeeName} subtitle={shift.shift_date} /><Card.Content><Text>{shift.shift_start_time}–{shift.shift_end_time}</Text><Text>{shift.shift_type}</Text></Card.Content><Card.Actions><Button onPress={() => onEdit(shift)}>Edit</Button><Button onPress={() => onDelete(shift.shift_id)}>Delete</Button></Card.Actions></Card>;
}
