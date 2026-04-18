import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  disconnectPOS,
  getPOSIntegrationStatus,
  getPOSModeSettings,
  triggerPOSSync,
  updatePOSModeSettings,
} from '../../../api/settings';
import type { POSProvider } from '../../../interfaces/pos';

export interface SnackbarState {
  visible: boolean;
  message: string;
}

export function useIntegrationSettings() {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<SnackbarState>({ visible: false, message: '' });

  const showSnackbar = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  const posSettingsQuery = useQuery({
    queryKey: ['mobilePosSettings'],
    queryFn: getPOSModeSettings,
  });

  const posStatusQuery = useQuery({
    queryKey: ['mobilePosStatus'],
    queryFn: getPOSIntegrationStatus,
    enabled: posSettingsQuery.data?.pos_mode === 'external',
  });

  const updateModeMutation = useMutation({
    mutationFn: updatePOSModeSettings,
    onSuccess: data => {
      queryClient.setQueryData(['mobilePosSettings'], data);
      queryClient.invalidateQueries({ queryKey: ['mobilePosStatus'] });
      showSnackbar('POS settings updated');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to update POS settings');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectPOS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobilePosSettings'] });
      queryClient.invalidateQueries({ queryKey: ['mobilePosStatus'] });
      showSnackbar('POS disconnected');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to disconnect POS');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerPOSSync(7),
    onSuccess: data => {
      posStatusQuery.refetch();
      showSnackbar(`Sync complete: ${data.orders_synced} orders synced`);
    },
    onError: () => {
      showSnackbar('Sync failed');
    },
  });

  const handleEnableExternal = (provider: POSProvider = 'square') => {
    const nextProvider = provider && provider !== 'none' ? provider : 'square';
    updateModeMutation.mutate({
      pos_mode: 'external',
      pos_provider: nextProvider,
    });
  };

  const handleProviderChange = (provider: POSProvider) => {
    if (!provider || provider === 'none') {
      return;
    }
    updateModeMutation.mutate({
      pos_mode: 'external',
      pos_provider: provider,
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const showWebSetupMessage = () => {
    showSnackbar('Finish POS connection in the web app.');
  };

  return {
    posSettings: posSettingsQuery.data,
    posStatus: posStatusQuery.data,
    isLoading: posSettingsQuery.isLoading,
    isStatusLoading: posStatusQuery.isLoading,
    posError: posSettingsQuery.error,
    isUpdatingMode: updateModeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,
    snackbar,
    closeSnackbar,
    handleEnableExternal,
    handleProviderChange,
    handleDisconnect,
    handleSync,
    showWebSetupMessage,
  };
}
