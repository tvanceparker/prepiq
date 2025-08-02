// src/pages/settings/hooks/useRestaurantSettings.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getRestaurantSettings,
    updateRestaurantSettings,
} from "../../../api/settings";
import { useUIStore } from "../../../stores/uiStore";

export function useRestaurantSettings() {
    const queryClient = useQueryClient();
    const showSnackbar = useUIStore((s) => s.showSnackbar);

    // Fetch settings with useQuery
    const {
        data: settings,
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: ["restaurantSettings"],
        queryFn: getRestaurantSettings,
    });

    // Mutation for updating settings
    const mutation = useMutation({
        mutationFn: updateRestaurantSettings,
        onSuccess: (newSettings) => {
            queryClient.setQueryData(["restaurantSettings"], newSettings);
            showSnackbar("Settings saved successfully!", "success");
        },
        onError: (err) => {
            showSnackbar(
                `Failed to save settings: ${err.message || "Unknown error"}`,
                "error"
            );
        },
    });

    return {
        settings,
        loading,
        error: isError ? error : null,
        saving: mutation.isLoading,
        saveSettings: mutation.mutateAsync,
    };
}
