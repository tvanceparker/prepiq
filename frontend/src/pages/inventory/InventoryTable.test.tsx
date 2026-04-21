import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import InventoryTable, {
  buildReorderBuckets,
  formatWatchChipLabel,
  getPackSummary,
} from './InventoryTable';
import { useInventoryTable } from './hooks/useInventoryTable';
import type { IngredientStockLevel, InventoryItem } from '../../interfaces/inventory';

jest.mock('./hooks/useInventoryTable', () => ({
  useInventoryTable: jest.fn(),
}));
jest.mock('./components/PackagingPopper', () => () => null);
jest.mock('./components/ChipInfoPopper', () => () => null);
jest.mock('./components/LotAdjustDialog', () => () => null);

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ state: null }),
  useNavigate: () => mockNavigate,
}));

jest.mock('material-react-table', () => ({
  MaterialReactTable: ({ columns, data }: any) => {
    const quantityColumn = columns.find((column: any) => column.accessorKey === 'quantity_on_hand');

    return (
      <div data-testid="mock-material-react-table">
        {data.map((row: any, index: number) => {
          const cell = {
            getIsGrouped: () => false,
            getValue: () => row.quantity_on_hand,
            row: { original: row },
          };

          return <div key={row.inventory_id ?? index}>{quantityColumn?.Cell?.({ cell })}</div>;
        })}
      </div>
    );
  },
}));

const mockedUseInventoryTable = useInventoryTable as jest.MockedFunction<typeof useInventoryTable>;

const baseInventoryItem: InventoryItem = {
  inventory_id: 1,
  ingredient_id: 101,
  batch_recipe_id: null,
  category: 'Produce',
  ingredient_name: 'Tomatoes',
  unit: 'lb',
  quantity_on_hand: 12,
  packaging_breakdown: [
    {
      lot_id: 10,
      delivery_date: '2026-04-20',
      quantity: 12,
      used_quantity: 0,
      wasted_quantity: 0,
      added_quantity: 12,
      remaining_quantity: 12,
      unit: 'lb',
      ingredient_supplier_id: 201,
      supplier_unit: 'lb',
      pack_size: 1,
      quantity_per_pack_item: 6,
      packages_received_total: 2,
      approx_packages_remaining: 2,
    },
  ],
};

const lowStockLevel: IngredientStockLevel = {
  ingredient_id: 101,
  ingredient_name: 'Tomatoes',
  current_stock: 8,
  unit: 'lb',
  reorder_point: 12,
  safety_stock: 9,
  watch_threshold: 9,
  watch_threshold_kind: 'safety_stock',
  watch_threshold_label: 'Safety buffer',
  threshold_available: true,
  threshold_message: null,
  forecast_run_date: '2026-04-20',
  status: 'low',
  supplier_count: 1,
  abc_class: 'A',
};

const warningStockLevel: IngredientStockLevel = {
  ingredient_id: 102,
  ingredient_name: 'Lemons',
  current_stock: 7,
  unit: 'each',
  reorder_point: 0,
  safety_stock: 5,
  watch_threshold: 5,
  watch_threshold_kind: 'safety_stock',
  watch_threshold_label: 'Safety buffer',
  threshold_available: true,
  threshold_message: null,
  forecast_run_date: '2026-04-20',
  status: 'warning',
  supplier_count: 1,
  abc_class: 'B',
};

const unavailableStockLevel: IngredientStockLevel = {
  ingredient_id: 103,
  ingredient_name: 'Basil',
  current_stock: 3,
  unit: 'oz',
  reorder_point: 0,
  safety_stock: 0,
  watch_threshold: null,
  watch_threshold_kind: null,
  watch_threshold_label: null,
  threshold_available: false,
  threshold_message: 'No finalized EOD forecast is available for the stock watch yet.',
  forecast_run_date: null,
  status: 'unavailable',
  supplier_count: 0,
  abc_class: 'C',
};

describe('InventoryTable helpers', () => {
  it('builds a pack summary when pack data is uniform', () => {
    expect(getPackSummary(baseInventoryItem)).toBe('~2 packs (1 x 6 lb)');
  });

  it('formats watch buckets and labels using watch thresholds', () => {
    const buckets = buildReorderBuckets([lowStockLevel, warningStockLevel, unavailableStockLevel]);

    expect(buckets.belowOrAt).toEqual([lowStockLevel]);
    expect(buckets.nearing).toEqual([warningStockLevel]);
    expect(formatWatchChipLabel(lowStockLevel)).toBe('Tomatoes · 8 lb / 9 lb · Safety buffer');
  });
});

describe('InventoryTable', () => {
  it('renders stock-watch messaging and quantity pack context', () => {
    mockedUseInventoryTable.mockReturnValue({
      inventory: [baseInventoryItem],
      loading: false,
      error: null,
      stockLevels: [lowStockLevel, warningStockLevel, unavailableStockLevel],
      stockLoading: false,
      stockError: null,
      discrepancies: [],
      discrepancyLoading: false,
      discrepancyError: null,
      adjustInventory: jest.fn(),
      setCurrentStock: jest.fn(),
      adjusting: false,
      refreshInventory: jest.fn(),
      refreshStockLevels: jest.fn(),
      refreshDiscrepancies: jest.fn(),
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <InventoryTable />
      </ThemeProvider>
    );

    expect(screen.getByText('Stock watch')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Uses the safety buffer when one is computed and falls back to reorder point/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 item still need a finalized forecast or replenishment policy/i)
    ).toBeInTheDocument();
    expect(screen.getByText('At or below watch threshold')).toBeInTheDocument();
    expect(screen.getByText('Nearing watch threshold')).toBeInTheDocument();
    expect(screen.getByText('Tomatoes · 8 lb / 9 lb · Safety buffer')).toBeInTheDocument();
    expect(screen.getByText('Lemons · 7 each / 5 each · Safety buffer')).toBeInTheDocument();
    expect(screen.getByText('12 lb')).toBeInTheDocument();
    expect(screen.getByText('~2 packs (1 x 6 lb)')).toBeInTheDocument();
  });
});
