// src/pages/dashboard/hooks/useMenuItems.js
import { useState, useEffect } from "react";
import {
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadMenuCSV,
} from "../../../api/dashboard";

export function useMenuItems() {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchMenuItems() {
            try {
                const items = await getMenuItems();
                setMenuItems(items);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        fetchMenuItems();
    }, []);

    const handleCreateMenuItem = async (itemData) => {
        const newItem = await createMenuItem(itemData);
        setMenuItems((prev) => [...prev, newItem]);
    };

    const handleUpdateMenuItem = async (id, itemData) => {
        const updatedItem = await updateMenuItem(id, itemData);
        setMenuItems((prev) =>
            prev.map((item) => (item.menu_item_id === id ? updatedItem : item))
        );
    };

    const handleDeleteMenuItem = async (id) => {
        await deleteMenuItem(id);
        setMenuItems((prev) => prev.filter((item) => item.menu_item_id !== id));
    };

    const handleUploadCSV = async (file) => {
        const uploadedItems = await uploadMenuCSV(file);
        setMenuItems((prev) => [...prev, ...uploadedItems]);
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
