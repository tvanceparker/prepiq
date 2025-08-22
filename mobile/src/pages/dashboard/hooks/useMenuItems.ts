import { useState, useEffect } from 'react';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuCSV,
} from '../../../api/dashboard';

export interface MobileMenuItem {
  menu_item_id: number;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
}

export function useMenuItems() {
  const [menuItems, setMenuItems] = useState<MobileMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const items = await getMenuItems();
        setMenuItems(items);
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateMenuItem = async (itemData: any) => {
    const newItem = await createMenuItem(itemData);
    setMenuItems(prev => [...prev, newItem]);
  };
  const handleUpdateMenuItem = async (id: number, itemData: any) => {
    const updated = await updateMenuItem(id, itemData);
    setMenuItems(prev => prev.map(mi => (mi.menu_item_id === id ? updated : mi)));
  };
  const handleDeleteMenuItem = async (id: number) => {
    await deleteMenuItem(id);
    setMenuItems(prev => prev.filter(mi => mi.menu_item_id !== id));
  };
  const handleUploadCSV = async (file: any) => {
    const uploaded = await uploadMenuCSV(file);
    setMenuItems(prev => [...prev, ...uploaded]);
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
