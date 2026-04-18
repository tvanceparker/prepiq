export type POSMode = 'none' | 'internal' | 'external';

export type POSProvider = 'square' | 'toast' | 'clover' | 'none' | null;

export interface POSModeSettings {
  pos_mode: POSMode;
  pos_provider: POSProvider;
  cash_drawer_enabled: boolean;
  stripe_terminal_location_id: string | null;
  has_terminal_readers: boolean;
  terminal_payments_enabled?: boolean;
  preferred_terminal_reader_id?: number | null;
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
