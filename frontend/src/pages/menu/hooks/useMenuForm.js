import { useState, useEffect } from 'react';
import {
  getRecipes,
  getMenuItems,
  getCategories,
  updateMenuItem,
  createMenuItem,
} from '../../../api/menu';
import { showSuccess, showError } from '../../../utils/toast';

export default function useMenuForm() {
  const [menuItems, setMenuItems] = useState([]);
  const [recipesList, setRecipesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    menu_item_name: '',
    price: '',
    category: '',
    recipes: [], // array of recipe_ids
  });

  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState('abc'); // or "category"

  // Fetch all menu items
  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const data = await getMenuItems();
      setMenuItems(data);
    } catch {
      showError('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all recipes available for linking
  const fetchRecipes = async () => {
    try {
      const data = await getRecipes();
      setRecipesList(data);
    } catch {
      showError('Failed to load recipes');
    }
  };

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategoriesList(data);
    } catch {
      showError('Failed to load categories');
    }
  };

  // Initial data load
  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
    fetchRecipes();
  }, []);

  // When editingItem changes, update formData with item info
  useEffect(() => {
    if (editingItem) {
      setFormData({
        menu_item_name: editingItem.menu_item_name || '',
        price: editingItem.price || '',
        category: editingItem.category || '',
        recipes: (editingItem.recipes || []).map(r => (r.recipe_id != null ? r.recipe_id : r.id)),
      });
    } else {
      setFormData({ menu_item_name: '', price: '', category: '', recipes: [] });
    }
  }, [editingItem]);

  // Save handler (create or update)
  const handleSave = async () => {
    if (!formData.menu_item_name.trim()) {
      return showError('Menu item name is required');
    }

    const payload = {
      name: formData.menu_item_name.trim(),
      price: parseFloat(formData.price) || 0,
      category: formData.category.trim(),
      recipes: formData.recipes,
    };

    try {
      if (editingItem?.menu_item_id) {
        await updateMenuItem(editingItem.menu_item_id, payload);
        showSuccess('Menu item updated!');
      } else {
        await createMenuItem(payload);
        showSuccess('Menu item created!');
      }
      setEditingItem(null);
      fetchMenuItems();
    } catch {
      showError('Failed to save menu item');
    }
  };

  // Soft delete handler (mark inactive)
  const handleDelete = async () => {
    if (!editingItem?.menu_item_id) return;

    if (editingItem.is_active === false) {
      return showError('Menu item is already inactive');
    }

    try {
      await updateMenuItem(editingItem.menu_item_id, { is_active: false });
      showSuccess('Menu item marked as inactive.');
      setEditingItem(null);
      fetchMenuItems();
    } catch {
      showError('Failed to delete menu item');
    }
  };

  // Reactivate handler (mark active)
  const handleReactivate = async () => {
    if (!editingItem?.menu_item_id) return;

    if (editingItem.is_active === true) {
      return showError('Menu item is already active');
    }

    try {
      await updateMenuItem(editingItem.menu_item_id, { is_active: true });
      showSuccess('Menu item reactivated.');
      setEditingItem(null);
      fetchMenuItems();
    } catch {
      showError('Failed to reactivate menu item');
    }
  };

  // Toggle recipe checkbox in formData.recipes
  const handleRecipeToggle = recipeId => {
    setFormData(f => ({
      ...f,
      recipes: f.recipes.includes(recipeId)
        ? f.recipes.filter(id => id !== recipeId)
        : [...f.recipes, recipeId],
    }));
  };

  // Filter and sort menu items
  const filteredMenuItems = menuItems.filter(item => item.is_active || showInactive);

  const sortedMenuItems = [...filteredMenuItems].sort((a, b) => {
    if (sortBy === 'abc') {
      return a.menu_item_name.localeCompare(b.menu_item_name);
    } else if (sortBy === 'category') {
      return a.category.localeCompare(b.category);
    }
    return 0;
  });

  return {
    menuItems: sortedMenuItems,
    recipesList,
    categoriesList,
    formData,
    setFormData,
    editingItem,
    setEditingItem,
    handleSave,
    handleDelete,
    handleReactivate,
    handleRecipeToggle,
    loading,
    showInactive,
    setShowInactive,
    sortBy,
    setSortBy,
    fetchMenuItems,
  };
}
