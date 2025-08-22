import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button } from 'react-native-paper';

interface ModalBaseProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  confirmDelete?: boolean;
  setConfirmDelete?: (v: boolean) => void;
  saveDisabled?: boolean;
  children?: React.ReactNode;
}

export default function ModalBase({
  visible,
  title,
  onClose,
  onSave,
  onDelete,
  confirmDelete = false,
  setConfirmDelete,
  saveDisabled,
  children,
}: ModalBaseProps) {
  const handleDelete = () => {
    if (!onDelete) return;
    if (!confirmDelete && setConfirmDelete) setConfirmDelete(true);
    else onDelete();
  };
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.container}>
        {title ? (
          <Text variant="titleLarge" style={styles.title}>
            {title}
          </Text>
        ) : null}
        <View style={styles.content}>{children}</View>
        <View style={styles.actions}>
          <Button onPress={onClose}>Cancel</Button>
          {onDelete && (
            <Button
              onPress={handleDelete}
              mode="contained"
              buttonColor={confirmDelete ? '#b91c1c' : '#ef4444'}
            >
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </Button>
          )}
          {onSave && (
            <Button onPress={onSave} mode="contained" disabled={!!saveDisabled}>
              Save
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', margin: 24, borderRadius: 16, padding: 20 },
  title: { marginBottom: 12 },
  content: { marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});
