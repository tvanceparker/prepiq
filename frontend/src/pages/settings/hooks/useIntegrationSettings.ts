// src/pages/settings/hooks/useIntegrationSettings.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteAssistantApiKey,
  getAssistantSettings,
  getPOSModeSettings,
  updatePOSModeSettings,
  updateAssistantSettings,
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
  const [assistantApiKeyInput, setAssistantApiKeyInput] = useState('');

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

  const assistantSettingsQuery = useQuery({
    queryKey: ['assistantSettings'],
    queryFn: getAssistantSettings,
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

  const updateAssistantMutation = useMutation({
    mutationFn: updateAssistantSettings,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assistantSettings'] });
      if (variables.openai_api_key) {
        setAssistantApiKeyInput('');
      }
      showSnackbar('Assistant settings updated', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to update assistant settings', 'error');
    },
  });

  const deleteAssistantApiKeyMutation = useMutation({
    mutationFn: deleteAssistantApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistantSettings'] });
      setAssistantApiKeyInput('');
      showSnackbar('Assistant API key removed', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to remove assistant API key', 'error');
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

  const handleAssistantToggle = (enabled: boolean) => {
    updateAssistantMutation.mutate({ enabled });
  };

  const handleAssistantApiKeyInputChange = (value: string) => {
    setAssistantApiKeyInput(value);
  };

  const handleSaveAssistantApiKey = async () => {
    const normalizedKey = assistantApiKeyInput.trim();
    if (!normalizedKey) {
      showSnackbar('Enter an OpenAI API key before saving', 'warning');
      return;
    }

    await updateAssistantMutation.mutateAsync({ openai_api_key: normalizedKey });
  };

  const handleDeleteAssistantApiKey = () => {
    deleteAssistantApiKeyMutation.mutate();
  };

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Data
    posSettings: posSettingsQuery.data,
    posStatus: posStatusQuery.data,
    lastSyncResult,
    assistantSettings: assistantSettingsQuery.data,
    assistantApiKeyInput,

    // Loading states
    isLoading: posSettingsQuery.isLoading,
    isStatusLoading: posStatusQuery.isLoading,
    isAssistantLoading: assistantSettingsQuery.isLoading,

    // Error states
    posError: posSettingsQuery.error,
    assistantError: assistantSettingsQuery.error,

    // Mutation pending states
    isUpdatingMode: updateModeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,
    isUpdatingAssistant: updateAssistantMutation.isPending,
    isDeletingAssistantApiKey: deleteAssistantApiKeyMutation.isPending,

    // Snackbar
    snackbar,
    closeSnackbar,

    // Handlers
    handleModeChange,
    handleProviderChange,
    handleConnectPOS,
    handleSync,
    handleDisconnect,
    handleAssistantToggle,
    handleAssistantApiKeyInputChange,
    handleSaveAssistantApiKey,
    handleDeleteAssistantApiKey,

    // Refetch
    refetchStatus: posStatusQuery.refetch,
  };
}
