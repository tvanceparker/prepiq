import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRestaurantSettings, updateRestaurantSettings } from '../../../api/settings';
import type { RestaurantSettings } from '../../../interfaces/settings';

export function useRestaurantSettings() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading: loading,
    error,
  } = useQuery<RestaurantSettings>({
    queryKey: ['restaurantSettings'],
    queryFn: getRestaurantSettings,
  });

  const mutation = useMutation({
    mutationFn: updateRestaurantSettings,
    onSuccess: (newSettings: any) => {
      queryClient.setQueryData(['restaurantSettings'], newSettings);
    },
  });

  return {
    settings,
    loading,
    error,
    saving: mutation.status === 'pending',
    saveSettings: mutation.mutateAsync,
  };
}
