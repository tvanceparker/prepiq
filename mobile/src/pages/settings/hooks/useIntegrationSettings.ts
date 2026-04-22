import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAssistantApiKey,
  disconnectPOS,
  getAssistantSettings,
  getPOSIntegrationStatus,
  getPOSModeSettings,
  triggerPOSSync,
  updateAssistantSettings,
  updatePOSModeSettings,
} from '../../../api/settings';
import type { POSProvider, POSSyncSummary } from '../../../interfaces/pos';

export interface SnackbarState {
  visible: boolean;
  message: string;
}

export function useIntegrationSettings() {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<SnackbarState>({ visible: false, message: '' });
  const [lastSyncResult, setLastSyncResult] = useState<POSSyncSummary | null>(null);
  const [assistantApiKeyInput, setAssistantApiKeyInput] = useState('');

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

  const assistantSettingsQuery = useQuery({
    queryKey: ['mobileAssistantSettings'],
    queryFn: getAssistantSettings,
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
      setLastSyncResult(data);
      posStatusQuery.refetch();
      showSnackbar(data.message);
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Sync failed');
    },
  });

  const updateAssistantMutation = useMutation({
    mutationFn: updateAssistantSettings,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mobileAssistantSettings'] });
      if (variables.openai_api_key) {
        setAssistantApiKeyInput('');
      }
      showSnackbar('Assistant settings updated');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to update assistant settings');
    },
  });

  const deleteAssistantApiKeyMutation = useMutation({
    mutationFn: deleteAssistantApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobileAssistantSettings'] });
      setAssistantApiKeyInput('');
      showSnackbar('Assistant API key removed');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to remove assistant API key');
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

  const handleAssistantToggle = (enabled: boolean) => {
    updateAssistantMutation.mutate({ enabled });
  };

  const handleAssistantApiKeyInputChange = (value: string) => {
    setAssistantApiKeyInput(value);
  };

  const handleSaveAssistantApiKey = async () => {
    const normalizedKey = assistantApiKeyInput.trim();
    if (!normalizedKey) {
      showSnackbar('Enter an OpenAI API key before saving');
      return;
    }

    await updateAssistantMutation.mutateAsync({ openai_api_key: normalizedKey });
  };

  const handleDeleteAssistantApiKey = () => {
    deleteAssistantApiKeyMutation.mutate();
  };

  return {
    posSettings: posSettingsQuery.data,
    posStatus: posStatusQuery.data,
    lastSyncResult,
    assistantSettings: assistantSettingsQuery.data,
    assistantApiKeyInput,
    isLoading: posSettingsQuery.isLoading,
    isStatusLoading: posStatusQuery.isLoading,
    isAssistantLoading: assistantSettingsQuery.isLoading,
    posError: posSettingsQuery.error,
    assistantError: assistantSettingsQuery.error,
    isUpdatingMode: updateModeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,
    isUpdatingAssistant: updateAssistantMutation.isPending,
    isDeletingAssistantApiKey: deleteAssistantApiKeyMutation.isPending,
    snackbar,
    closeSnackbar,
    handleEnableExternal,
    handleProviderChange,
    handleDisconnect,
    handleSync,
    showWebSetupMessage,
    handleAssistantToggle,
    handleAssistantApiKeyInputChange,
    handleSaveAssistantApiKey,
    handleDeleteAssistantApiKey,
  };
}
