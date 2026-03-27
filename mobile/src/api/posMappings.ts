import { get, put } from './index';
import type { POSUnmappedItem } from '../interfaces/pos';

export const getUnmappedPOSItems = async (posProvider: string): Promise<{
  unmapped_items: POSUnmappedItem[];
  count: number;
}> => get(`/pos/mappings/unmapped?pos_provider=${posProvider}`);

export const updatePOSItemMapping = async (
  mappingId: number,
  payload: {
    menu_item_id?: number;
    mapping_status?: string;
    confidence_score?: number;
  }
) => put(`/pos/mappings/${mappingId}`, payload);