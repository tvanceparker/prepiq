import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRestaurantSettings, updateRestaurantSettings } from "../../../api/settings";
import { useUIStore } from "../../../stores/uiStore";
import type { RestaurantSettings } from "../../../interfaces/settings";

export function useRestaurantSettings() {
  const queryClient = useQueryClient();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const { data: settings, isLoading: loading, isError, error } = useQuery<RestaurantSettings>({
    queryKey: ["restaurantSettings"],
    queryFn: getRestaurantSettings,
  });

  const mutation = useMutation({
    mutationFn: updateRestaurantSettings,
    onSuccess: (newSettings: any) => {
      queryClient.setQueryData(["restaurantSettings"], newSettings);
      showSnackbar("Settings saved successfully!", "success");
    },
    onError: (err: any) => {
      showSnackbar(`Failed to save settings: ${err.message || "Unknown error"}`, "error");
    },
  });

  return {
    settings,
    loading,
    error: isError ? error : null,
    saving: mutation.status === "pending",
    saveSettings: mutation.mutateAsync,
  };
}
