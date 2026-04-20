// src/pages/settings/hooks/useIntegrationSettings.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPOSModeSettings,
  updatePOSModeSettings,
  getPOSIntegrationStatus,
  getPOSOAuthUrl,
  disconnectPOS,
  triggerPOSSync,
} from '../../../api/settings';
import type { POSProvider, POSSyncSummary } from '../../../interfaces/pos';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export function useIntegrationSettings() {
  const queryClient = useQueryClient();

  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [lastSyncResult, setLastSyncResult] = useState<POSSyncSummary | null>(null);

  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // =========================================================================
  // Queries
  // =========================================================================

  // POS Mode settings query
  const posSettingsQuery = useQuery({
    queryKey: ['posSettings'],
    queryFn: getPOSModeSettings,
  });

  // External POS status query (only when external mode)
  const posStatusQuery = useQuery({
    queryKey: ['posStatus'],
    queryFn: getPOSIntegrationStatus,
    enabled: posSettingsQuery.data?.pos_mode === 'external',
  });

  // =========================================================================
  // Mutations
  // =========================================================================

  const updateModeMutation = useMutation({
    mutationFn: updatePOSModeSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posSettings'] });
      showSnackbar('POS settings updated', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to update settings', 'error');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectPOS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posSettings'] });
      queryClient.invalidateQueries({ queryKey: ['posStatus'] });
      showSnackbar('POS disconnected', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to disconnect POS', 'error');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerPOSSync(7),
    onSuccess: data => {
      setLastSyncResult(data);
      posStatusQuery.refetch();
      const severity =
        data.status === 'failed' ? 'error' : data.status === 'partial' ? 'warning' : 'success';
      showSnackbar(data.message, severity);
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Sync failed', 'error');
    },
  });

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleModeChange = (newMode: 'external') => {
    updateModeMutation.mutate({
      pos_mode: newMode,
      pos_provider: 'square',
    });
  };

  const handleProviderChange = (provider: POSProvider) => {
    if (!provider) return;
    updateModeMutation.mutate({
      pos_mode: 'external',
      pos_provider: provider,
    });
  };

  const handleConnectPOS = async (provider: string) => {
    try {
      const state = Math.random().toString(36).substring(7);
      const redirectUri = `${window.location.origin}/settings/pos-callback`;
      const result = await getPOSOAuthUrl({
        provider,
        redirect_uri: redirectUri,
        state,
      });
      // Store state in sessionStorage for verification
      sessionStorage.setItem('pos_oauth_state', state);
      // Redirect to OAuth
      window.location.href = result.oauth_url;
    } catch (error) {
      showSnackbar('Failed to start connection', 'error');
    }
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Data
    posSettings: posSettingsQuery.data,
    posStatus: posStatusQuery.data,
    lastSyncResult,

    // Loading states
    isLoading: posSettingsQuery.isLoading,
    isStatusLoading: posStatusQuery.isLoading,

    // Error states
    posError: posSettingsQuery.error,

    // Mutation pending states
    isUpdatingMode: updateModeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,

    // Snackbar
    snackbar,
    closeSnackbar,

    // Handlers
    handleModeChange,
    handleProviderChange,
    handleConnectPOS,
    handleSync,
    handleDisconnect,

    // Refetch
    refetchStatus: posStatusQuery.refetch,
  };
}
