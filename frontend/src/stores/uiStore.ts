// stores/uiStore.ts
import { create } from 'zustand';
import { AlertColor } from '@mui/material';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface UIStore {
  isEditing: boolean;
  formData: Record<string, any> | null;
  snackbar: SnackbarState;
  openEditModal: (data: Record<string, any>) => void;
  closeEditModal: () => void;
  updateFormField: (field: string, value: any) => void;
  showSnackbar: (message: string, severity?: AlertColor) => void;
  closeSnackbar: () => void;
}

export const useUIStore = create<UIStore>(set => ({
  isEditing: false,
  formData: null,

  openEditModal: (data: Record<string, any>) =>
    set({
      isEditing: true,
      formData: { ...data },
    }),

  closeEditModal: () =>
    set({
      isEditing: false,
      formData: null,
    }),

  updateFormField: (field: string, value: any) =>
    set(state => ({
      formData: { ...state.formData, [field]: value },
    })),

  snackbar: {
    open: false,
    message: '',
    severity: 'info' as AlertColor,
  },

  showSnackbar: (message: string, severity: AlertColor = 'info') =>
    set({
      snackbar: { open: true, message, severity },
    }),

  closeSnackbar: () =>
    set(state => ({
      snackbar: { ...state.snackbar, open: false },
    })),
}));
