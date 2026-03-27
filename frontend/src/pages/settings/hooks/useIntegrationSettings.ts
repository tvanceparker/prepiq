// src/pages/settings/hooks/useIntegrationSettings.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPOSModeSettings,
  updatePOSModeSettings,
  getPOSIntegrationStatus,
  getPOSImportHealth,
  getPOSOAuthUrl,
  completePOSOAuth,
  disconnectPOS,
  triggerPOSSync,
} from '../../../api/settings';
import {
  listTerminalReaders,
  registerTerminalReader,
  deleteTerminalReader,
  syncTerminalReaderStatus,
  getTerminalLocation,
} from '../../../api/pos';
import { getMenuItems } from '../../../api/menu';
import { updatePOSItemMapping } from '../../../api/posMappings';
import type { POSMode, POSProvider } from '../../../interfaces/pos';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const POS_OAUTH_SESSION_KEY = 'pos_oauth_session';

export interface POSOAuthSession {
  state: string;
  provider: Exclude<POSProvider, null | 'none'>;
  redirectUri: string;
}

export const storePOSOAuthSession = (session: POSOAuthSession) => {
  sessionStorage.setItem(POS_OAUTH_SESSION_KEY, JSON.stringify(session));
};

export const getStoredPOSOAuthSession = (): POSOAuthSession | null => {
  const raw = sessionStorage.getItem(POS_OAUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as POSOAuthSession;
  } catch {
    sessionStorage.removeItem(POS_OAUTH_SESSION_KEY);
    return null;
  }
};

export const clearStoredPOSOAuthSession = () => {
  sessionStorage.removeItem(POS_OAUTH_SESSION_KEY);
};

export const completeStoredPOSOAuth = async (code: string, state: string) => {
  const session = getStoredPOSOAuthSession();

  if (!session) {
    throw new Error('Missing saved POS connection session. Start the connection again.');
  }

  if (session.state !== state) {
    clearStoredPOSOAuthSession();
    throw new Error('POS connection state check failed. Start the connection again.');
  }

  const result = await completePOSOAuth({
    provider: session.provider,
    code,
    redirect_uri: session.redirectUri,
  });

  clearStoredPOSOAuthSession();
  return result;
};

export function useIntegrationSettings() {
  const queryClient = useQueryClient();

  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

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

  const posImportHealthQuery = useQuery({
    queryKey: ['posImportHealth'],
    queryFn: () => getPOSImportHealth(10),
    enabled: posSettingsQuery.data?.pos_mode === 'external',
  });

  // Terminal readers query (only when internal mode)
  const terminalReadersQuery = useQuery({
    queryKey: ['terminalReaders'],
    queryFn: () => listTerminalReaders(),
    enabled: posSettingsQuery.data?.pos_mode === 'internal',
  });

  // Terminal location query
  const terminalLocationQuery = useQuery({
    queryKey: ['terminalLocation'],
    queryFn: getTerminalLocation,
    enabled: posSettingsQuery.data?.pos_mode === 'internal',
  });

  const menuItemsQuery = useQuery({
    queryKey: ['menuItemsForPOSMapping'],
    queryFn: getMenuItems,
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
      queryClient.invalidateQueries({ queryKey: ['posImportHealth'] });
      showSnackbar('POS disconnected', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to disconnect POS', 'error');
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: ({ mappingId, menuItemId }: { mappingId: number; menuItemId: number }) =>
      updatePOSItemMapping(mappingId, {
        menu_item_id: menuItemId,
        mapping_status: 'manual',
        confidence_score: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posImportHealth'] });
      showSnackbar('POS item mapping saved', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to save POS item mapping', 'error');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerPOSSync(7),
    onSuccess: data => {
      posStatusQuery.refetch();
      posImportHealthQuery.refetch();
      showSnackbar(`Sync complete: ${data.orders_synced} orders synced`, 'success');
    },
    onError: () => {
      showSnackbar('Sync failed', 'error');
    },
  });

  const registerReaderMutation = useMutation({
    mutationFn: (data: { registration_code: string; label: string }) =>
      registerTerminalReader(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminalReaders'] });
      showSnackbar('Reader registered successfully', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to register reader', 'error');
    },
  });

  const deleteReaderMutation = useMutation({
    mutationFn: deleteTerminalReader,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminalReaders'] });
      showSnackbar('Reader removed', 'success');
    },
    onError: (error: any) => {
      showSnackbar(error?.message || 'Failed to remove reader', 'error');
    },
  });

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleModeChange = (newMode: POSMode) => {
    updateModeMutation.mutate({
      pos_mode: newMode,
      pos_provider: newMode === 'external' ? 'square' : null,
      cash_drawer_enabled: posSettingsQuery.data?.cash_drawer_enabled ?? true,
    });
  };

  const handleProviderChange = (provider: POSProvider) => {
    if (!provider) return;
    updateModeMutation.mutate({
      pos_mode: 'external',
      pos_provider: provider,
      cash_drawer_enabled: posSettingsQuery.data?.cash_drawer_enabled ?? true,
    });
  };

  const handleCashDrawerToggle = () => {
    updateModeMutation.mutate({
      pos_mode: posSettingsQuery.data?.pos_mode || 'internal',
      pos_provider: posSettingsQuery.data?.pos_provider,
      cash_drawer_enabled: !posSettingsQuery.data?.cash_drawer_enabled,
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
      storePOSOAuthSession({
        state,
        provider: provider as Exclude<POSProvider, null | 'none'>,
        redirectUri,
      });
      // Redirect to OAuth
      window.location.href = result.oauth_url;
    } catch (error) {
      showSnackbar('Failed to start connection', 'error');
    }
  };

  const handleRegisterReader = (registrationCode: string, label: string) => {
    if (!registrationCode || !label) return false;
    registerReaderMutation.mutate({
      registration_code: registrationCode,
      label: label,
    });
    return true;
  };

  const handleDeleteReader = (readerId: number) => {
    deleteReaderMutation.mutate(readerId);
  };

  const handleSyncReaderStatus = async (readerId: number) => {
    try {
      await syncTerminalReaderStatus(readerId);
      queryClient.invalidateQueries({ queryKey: ['terminalReaders'] });
      showSnackbar('Reader status synced', 'success');
    } catch (error) {
      showSnackbar('Failed to sync reader status', 'error');
    }
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleUpdatePOSMapping = (mappingId: number, menuItemId: number) => {
    updateMappingMutation.mutate({ mappingId, menuItemId });
  };

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Data
    posSettings: posSettingsQuery.data,
    posStatus: posStatusQuery.data,
    posImportHealth: posImportHealthQuery.data,
    menuItems: menuItemsQuery.data || [],
    terminalReaders: terminalReadersQuery.data?.readers || [],
    terminalLocation: terminalLocationQuery.data,

    // Loading states
    isLoading: posSettingsQuery.isLoading,
    isStatusLoading: posStatusQuery.isLoading,
    isImportHealthLoading: posImportHealthQuery.isLoading,
    isMenuItemsLoading: menuItemsQuery.isLoading,
    isReadersLoading: terminalReadersQuery.isLoading,

    // Error states
    posError: posSettingsQuery.error,

    // Mutation pending states
    isUpdatingMode: updateModeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,
    isUpdatingMapping: updateMappingMutation.isPending,
    isRegisteringReader: registerReaderMutation.isPending,
    isDeletingReader: deleteReaderMutation.isPending,

    // Snackbar
    snackbar,
    closeSnackbar,

    // Handlers
    handleModeChange,
    handleProviderChange,
    handleCashDrawerToggle,
    handleConnectPOS,
    handleRegisterReader,
    handleDeleteReader,
    handleSyncReaderStatus,
    handleSync,
    handleDisconnect,
    handleUpdatePOSMapping,

    // Refetch
    refetchStatus: posStatusQuery.refetch,
  };
}
