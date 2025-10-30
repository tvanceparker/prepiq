import { useState, useEffect } from 'react';
import {
  fetchAllInventory,
  fetchLotInfo,
  fetchUsedUsageLogs,
  fetchWastedUsageLogs,
} from '../../../api/inventory';
import { InventoryItem, LotInfo, UsageLog } from '../../../interfaces/inventory';

// ✅ 1. Main inventory list
export function useInventoryTable() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAllInventory()
      .then(data => setInventory(data as InventoryItem[]))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { inventory, loading, error };
}

// ✅ 2. Lot info (supplier, etc.)
export function useLotInfo(lotId: number | null) {
  const [lotInfo, setLotInfo] = useState<LotInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!lotId) {
      setLotInfo(null);
      return;
    }
    setLoading(true);
    fetchLotInfo(lotId)
      .then(data => setLotInfo(data as LotInfo))
      .catch(() => setLotInfo(null))
      .finally(() => setLoading(false));
  }, [lotId]);

  return { lotInfo, loading };
}

// ✅ 3. Used usage logs
export function useUsedUsageLogs(lotId: number | null) {
  const [usedLogs, setUsedLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!lotId) {
      setUsedLogs([]);
      return;
    }
    setLoading(true);
    fetchUsedUsageLogs(lotId)
      .then(data => setUsedLogs(data as UsageLog[]))
      .catch(() => setUsedLogs([]))
      .finally(() => setLoading(false));
  }, [lotId]);

  return { usedLogs, loading };
}

// ✅ 4. Wasted usage logs
export function useWastedUsageLogs(lotId: number | null) {
  const [wastedLogs, setWastedLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!lotId) {
      setWastedLogs([]);
      return;
    }
    setLoading(true);
    fetchWastedUsageLogs(lotId)
      .then(data => setWastedLogs(data as UsageLog[]))
      .catch(() => setWastedLogs([]))
      .finally(() => setLoading(false));
  }, [lotId]);

  return { wastedLogs, loading };
}
