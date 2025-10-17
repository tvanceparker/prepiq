import { get } from './index';

export interface IngredientName {
  ingredient_id: number;
  ingredient_name: string;
}

export async function fetchIngredientNames(): Promise<IngredientName[]> {
  return get('/inventory/ingredient_names');
}
