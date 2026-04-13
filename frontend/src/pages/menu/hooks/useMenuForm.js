import { useEffect, useMemo, useState } from 'react';
import {
  getRecipes,
  getMenuItems,
  getCategories,
  updateMenuItem,
  createMenuItem,
} from '../../../api/menu';
import { showSuccess, showError } from '../../../utils/toast';

const blankForm = () => ({
  menu_item_name: '',
  price: '',
  category: '',
  recipes: [],
});

export default function useMenuForm() {
  const [menuItems, setMenuItems] = useState([]);
  const [recipesList, setRecipesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [editorMode, setEditorMode] = useState('view');
  const [formData, setFormData] = useState(blankForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState('category');

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

  const fetchRecipes = async () => {
    try {
      const data = await getRecipes();
      setRecipesList(data);
    } catch {
      showError('Failed to load recipes');
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategoriesList(data);
    } catch {
      showError('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
    fetchRecipes();
  }, []);

  useEffect(() => {
    if (selectedItemId || editorMode === 'create') {
      return;
    }

    const firstVisibleItem = menuItems.find(item => item.is_active || showInactive);
    if (firstVisibleItem) {
      setSelectedItemId(firstVisibleItem.menu_item_id);
    }
  }, [menuItems, selectedItemId, editorMode, showInactive]);

  const selectedItem = useMemo(
    () => menuItems.find(item => item.menu_item_id === selectedItemId) || null,
    [menuItems, selectedItemId]
  );

  const loadFormFromItem = item => {
    setFormData({
      menu_item_name: item?.menu_item_name || '',
      price: item?.price != null ? String(item.price) : '',
      category: item?.category || '',
      recipes: (item?.recipes || []).map(recipe => recipe.recipe_id),
    });
  };

  const startCreate = () => {
    setEditorMode('create');
    setFormData(blankForm());
  };

  const startEdit = item => {
    const nextItem = item || selectedItem;
    if (!nextItem) {
      return;
    }
    setSelectedItemId(nextItem.menu_item_id);
    setEditorMode('edit');
    loadFormFromItem(nextItem);
  };

  const cancelEditing = () => {
    setEditorMode('view');
    if (selectedItem) {
      loadFormFromItem(selectedItem);
    } else {
      setFormData(blankForm());
    }
  };

  const selectItem = itemId => {
    setSelectedItemId(itemId);
    setEditorMode('view');
  };

  const saveItem = async () => {
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
      setSaving(true);

      if (editorMode === 'edit' && selectedItemId) {
        await updateMenuItem(selectedItemId, payload);
        showSuccess('Menu item updated!');
      } else {
        const created = await createMenuItem(payload);
        showSuccess('Menu item created!');
        if (created?.menu_item_id) {
          setSelectedItemId(created.menu_item_id);
        }
      }

      await fetchMenuItems();
      setEditorMode('view');
    } catch {
      showError('Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const archiveSelectedItem = async () => {
    if (!selectedItem?.menu_item_id) return;

    if (selectedItem.is_active === false) {
      return showError('Menu item is already inactive');
    }

    try {
      await updateMenuItem(selectedItem.menu_item_id, { is_active: false });
      showSuccess('Menu item marked as inactive.');
      await fetchMenuItems();
      setEditorMode('view');
    } catch {
      showError('Failed to delete menu item');
    }
  };

  const reactivateSelectedItem = async () => {
    if (!selectedItem?.menu_item_id) return;

    if (selectedItem.is_active === true) {
      return showError('Menu item is already active');
    }

    try {
      await updateMenuItem(selectedItem.menu_item_id, { is_active: true });
      showSuccess('Menu item reactivated.');
      await fetchMenuItems();
      setEditorMode('view');
    } catch {
      showError('Failed to reactivate menu item');
    }
  };

  const toggleRecipe = recipeId => {
    setFormData(f => ({
      ...f,
      recipes: f.recipes.includes(recipeId)
        ? f.recipes.filter(id => id !== recipeId)
        : [...f.recipes, recipeId],
    }));
  };

  const filteredMenuItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visibleItems = menuItems.filter(item => item.is_active || showInactive);

    const searchedItems = visibleItems.filter(item => {
      if (!query) {
        return true;
      }

      return [
        item.menu_item_name,
        item.category,
        ...(item.recipes || []).map(recipe => recipe.recipe_name),
      ]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    });

    return [...searchedItems].sort((a, b) => {
      if (sortBy === 'name') {
        return a.menu_item_name.localeCompare(b.menu_item_name);
      }

      if (sortBy === 'recipes') {
        return (b.recipes?.length || 0) - (a.recipes?.length || 0);
      }

      return (
        (a.category || '').localeCompare(b.category || '') ||
        a.menu_item_name.localeCompare(b.menu_item_name)
      );
    });
  }, [menuItems, searchQuery, showInactive, sortBy]);

  const stats = useMemo(() => {
    const activeItems = menuItems.filter(item => item.is_active).length;
    const categories = new Set(menuItems.map(item => item.category).filter(Boolean));
    const linkedRecipeCount = menuItems.reduce(
      (count, item) => count + (item.recipes?.length || 0),
      0
    );

    return {
      totalItems: menuItems.length,
      activeItems,
      categoryCount: categories.size,
      linkedRecipeCount,
    };
  }, [menuItems]);

  const selectedItemRecipes = selectedItem?.recipes || [];

  return {
    menuItems: filteredMenuItems,
    allMenuItems: menuItems,
    recipesList,
    categoriesList,
    formData,
    setFormData,
    selectedItem,
    selectedItemId,
    setSelectedItemId: selectItem,
    saveItem,
    archiveSelectedItem,
    reactivateSelectedItem,
    toggleRecipe,
    loading,
    saving,
    showInactive,
    setShowInactive,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    stats,
    editorMode,
    isEditing: editorMode !== 'view',
    startCreate,
    startEdit,
    cancelEditing,
    selectedItemRecipes,
    fetchMenuItems,
  };
}
