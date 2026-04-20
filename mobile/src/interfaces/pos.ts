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

export interface POSSyncFailure {
  external_id?: string | null;
  reason: string;
}

export interface POSSyncSummary {
  sync_id: string;
  provider: string;
  status: 'success' | 'partial' | 'failed';
  message: string;
  start_date: string;
  end_date: string;
  total_orders_fetched: number;
  total_orders_ingested: number;
  total_orders_failed: number;
  total_items_synced: number;
  duplicate_orders: number;
  failed_orders: POSSyncFailure[];
  unmapped_items: string[];
  deduction_failures: string[];
}
