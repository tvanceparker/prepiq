import { useState, useEffect, useCallback } from 'react';
import {
  adjustInventory,
  fetchAllInventory,
  fetchLotInfo,
  fetchUsedUsageLogs,
  fetchWastedUsageLogs,
  getInventoryDeductionDiscrepancies,
  getIngredientsStockLevels,
  setInventoryCurrentStock,
} from '../../../api/inventory';
import {
  InventoryItem,
  LotInfo,
  UsageLog,
  IngredientStockLevel,
  InventoryDeductionDiscrepancy,
  InventoryAdjustmentResult,
} from '../../../interfaces/inventory';

// ✅ 1. Main inventory list
export function useInventoryTable() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const [adjusting, setAdjusting] = useState<boolean>(false);

  const [stockLevels, setStockLevels] = useState<IngredientStockLevel[]>([]);
  const [stockLoading, setStockLoading] = useState<boolean>(true);
  const [stockError, setStockError] = useState<Error | null>(null);
  const [discrepancies, setDiscrepancies] = useState<InventoryDeductionDiscrepancy[]>([]);
  const [discrepancyLoading, setDiscrepancyLoading] = useState<boolean>(true);
  const [discrepancyError, setDiscrepancyError] = useState<Error | null>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllInventory();
      setInventory(data as InventoryItem[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStockLevels = useCallback(async () => {
    setStockLoading(true);
    setStockError(null);
    try {
      const data = await getIngredientsStockLevels();
      setStockLevels(data as IngredientStockLevel[]);
    } catch (err) {
      setStockError(err as Error);
    } finally {
      setStockLoading(false);
    }
  }, []);

  const loadDiscrepancies = useCallback(async () => {
    setDiscrepancyLoading(true);
    setDiscrepancyError(null);
    try {
      const data = await getInventoryDeductionDiscrepancies();
      setDiscrepancies(data as InventoryDeductionDiscrepancy[]);
    } catch (err) {
      setDiscrepancyError(err as Error);
      setDiscrepancies([]);
    } finally {
      setDiscrepancyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    loadStockLevels();
  }, [loadStockLevels]);

  useEffect(() => {
    loadDiscrepancies();
  }, [loadDiscrepancies]);

  const adjustInventoryItem = useCallback(
    async (payload: {
      inventory_id: number;
      lot_id: number;
      adjustment_quantity: number;
      usage_type: string;
      reference_id?: number;
      notes?: string;
    }) => {
      setAdjusting(true);
      try {
        const response = await adjustInventory(payload);
        await Promise.all([loadInventory(), loadStockLevels(), loadDiscrepancies()]);
        return response;
      } finally {
        setAdjusting(false);
      }
    },
    [loadDiscrepancies, loadInventory, loadStockLevels]
  );

  const setCurrentStockItem = useCallback(
    async (payload: {
      inventory_id: number;
      counted_quantity: number;
      lot_id?: number | null;
      reason?: string | null;
      notes?: string;
    }): Promise<InventoryAdjustmentResult> => {
      setAdjusting(true);
      try {
        const response = await setInventoryCurrentStock(payload);
        await Promise.all([loadInventory(), loadStockLevels(), loadDiscrepancies()]);
        return response;
      } finally {
        setAdjusting(false);
      }
    },
    [loadDiscrepancies, loadInventory, loadStockLevels]
  );

  return {
    inventory,
    loading,
    error,
    stockLevels,
    stockLoading,
    stockError,
    discrepancies,
    discrepancyLoading,
    discrepancyError,
    adjustInventory: adjustInventoryItem,
    setCurrentStock: setCurrentStockItem,
    adjusting,
    refreshInventory: loadInventory,
    refreshStockLevels: loadStockLevels,
    refreshDiscrepancies: loadDiscrepancies,
  };
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
