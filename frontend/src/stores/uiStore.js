// stores/uiStore.js
import { create } from "zustand";

export const useUIStore = create((set) => ({
    isEditing: false,
    formData: null,

    openEditModal: (data) =>
        set({
            isEditing: true,
            formData: { ...data },
        }),

    closeEditModal: () =>
        set({
            isEditing: false,
            formData: null,
        }),

    updateFormField: (field, value) =>
        set((state) => ({
            formData: { ...state.formData, [field]: value },
        })),

    snackbar: {
        open: false,
        message: "",
        severity: "info",
    },

    showSnackbar: (message, severity = "info") =>
        set({
            snackbar: { open: true, message, severity },
        }),

    closeSnackbar: () =>
        set((state) => ({
            snackbar: { ...state.snackbar, open: false },
        })),
}));
