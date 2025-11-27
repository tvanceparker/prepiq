// src/hooks/useStockMovements.ts
import { useQuery } from '@tanstack/react-query';
import { getStockMovements } from '../api/inventory';
import type { StockMovement } from '../interfaces/inventory';

export interface UseStockMovementsOptions {
  startDate: string;
  endDate: string;
  ingredientId?: number;
}

export function useStockMovements(options: UseStockMovementsOptions) {
  const { startDate, endDate, ingredientId } = options;

  const movementsQuery = useQuery({
    queryKey: ['stockMovements', startDate, endDate, ingredientId],
    queryFn: () => getStockMovements(startDate, endDate, ingredientId),
    enabled: Boolean(startDate && endDate),
  });

  // Group by date for SectionList
  const movementsByDate = (movementsQuery.data ?? []).reduce((acc, movement) => {
    const date = movement.date.split('T')[0]; // Get just the date part
    if (!acc[date]) acc[date] = [];
    acc[date].push(movement);
    return acc;
  }, {} as Record<string, StockMovement[]>);

  // Convert to sections format
  const sections = Object.entries(movementsByDate)
    .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
    .map(([date, data]) => ({
      title: date,
      data,
    }));

  // Group by type for summary
  const movementsByType = (movementsQuery.data ?? []).reduce((acc, movement) => {
    if (!acc[movement.type]) acc[movement.type] = [];
    acc[movement.type].push(movement);
    return acc;
  }, {} as Record<string, StockMovement[]>);

  // Calculate totals by type
  const totalsByType = Object.entries(movementsByType).reduce((acc, [type, movements]) => {
    acc[type] = movements.reduce((sum, m) => sum + m.quantity, 0);
    return acc;
  }, {} as Record<string, number>);

  return {
    movements: movementsQuery.data ?? [],
    movementsByDate,
    movementsByType,
    sections,
    totalsByType,
    loading: movementsQuery.isLoading,
    error: movementsQuery.error,
    isRefetching: movementsQuery.isRefetching,
  };
}

export default useStockMovements;
