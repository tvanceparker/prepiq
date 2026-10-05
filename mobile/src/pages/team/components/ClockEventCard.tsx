import React from 'react';
import { Card, Text } from 'react-native-paper';
import type { ClockEvent } from '../../../interfaces/team';
export function ClockEventCard({ event, employeeName }: { event: ClockEvent; employeeName: string }) {
  return <Card mode="outlined"><Card.Content><Text variant="titleMedium">{employeeName}</Text><Text>{event.clock_in} → {event.clock_out || 'Clocked in'}</Text>{event.notes && <Text>{event.notes}</Text>}</Card.Content></Card>;
}
