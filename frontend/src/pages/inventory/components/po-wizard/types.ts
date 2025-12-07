import type {
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../../../../interfaces/inventory';

export interface IngredientCartItem {
  ingredient: IngredientStockLevel;
  supplier: IngredientSupplierOption;
  qtyPacks: number;
}
