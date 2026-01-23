import { useEffect, useState } from 'react';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../../../api/dashboard';
import type { MenuItemDTO } from '../../../interfaces/dashboardInterfaceFrontend';

export function useDashboardForm() {
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadMenuItems = async () => {
      setLoading(true);
      try {
        const items = await getMenuItems();
        if (isActive) setMenuItems(items || []);
      } catch (err: any) {
        if (isActive) setError(err);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    loadMenuItems();
    return () => {
      isActive = false;
    };
  }, []);

  const addItem = async (item: Partial<MenuItemDTO>) => {
    setLoading(true);
    try {
      const created = await createMenuItem(item as any);
      setMenuItems(prev => [...prev, created as any]);
      return created;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editItem = async (id: number, data: Partial<MenuItemDTO>) => {
    setLoading(true);
    try {
      const updated = await updateMenuItem(id, data as any);
      setMenuItems(prev => prev.map(m => (m.menu_item_id === id ? (updated as any) : m)));
      return updated;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id: number) => {
    setLoading(true);
    try {
      await deleteMenuItem(id);
      setMenuItems(prev => prev.filter(m => m.menu_item_id !== id));
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { menuItems, loading, error, addItem, editItem, removeItem };
}
