import React from 'react';
import { IconButton } from 'react-native-paper';

interface Props { onPress: () => void; disabled?: boolean }
export default function EditButton({ onPress, disabled }: Props) {
  return <IconButton icon="pencil" disabled={disabled} onPress={onPress} />;
}
