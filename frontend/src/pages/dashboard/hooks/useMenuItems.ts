import { useState, useEffect } from 'react';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuCSV,
} from '../../../api/dashboard';
import type { MenuItemDTO } from '../../../interfaces/dashboardInterfaceFrontend';

export function useMenuItems() {
  const [menuItems, setMenuItems] = useState<MenuItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMenuItems() {
      try {
        const items = await getMenuItems();
        setMenuItems(items as any);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchMenuItems();
  }, []);

  const handleCreateMenuItem = async (itemData: Partial<MenuItemDTO>) => {
    const newItem = await createMenuItem(itemData as any);
    setMenuItems((prev) => [...prev, newItem as any]);
  };

  const handleUpdateMenuItem = async (id: number, itemData: Partial<MenuItemDTO>) => {
    const updatedItem = await updateMenuItem(id, itemData as any);
    setMenuItems((prev) => prev.map((item) => (item.menu_item_id === id ? updatedItem as any : item)));
  };

  const handleDeleteMenuItem = async (id: number) => {
    await deleteMenuItem(id);
    setMenuItems((prev) => prev.filter((item) => item.menu_item_id !== id));
  };

  const handleUploadCSV = async (file: File) => {
    const uploadedItems = await uploadMenuCSV(file);
    setMenuItems((prev) => [...prev, ...(uploadedItems as any)]);
  };

  return {
    menuItems,
    loading,
    error,
    handleCreateMenuItem,
    handleUpdateMenuItem,
    handleDeleteMenuItem,
    handleUploadCSV,
  };
}
