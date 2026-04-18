export type POSMode = 'none' | 'external';

export type POSProvider = 'square' | 'toast' | 'clover' | 'none' | null;

export interface POSModeSettings {
  pos_mode: POSMode;
  pos_provider: POSProvider;
}

export interface ExternalPOSStatus {
  provider: POSProvider;
  connected: boolean;
  location_id?: string | null;
  merchant_id: string | null;
  last_sync: string | null;
  sync_enabled?: boolean;
  sync_orders?: boolean;
  sync_payments?: boolean;
  sync_menu?: boolean;
}
