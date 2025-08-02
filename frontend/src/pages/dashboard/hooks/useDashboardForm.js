// src/pages/dashboard/hooks/useDashboardForm.js
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import {
    getDailyOverview,
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    uploadMenuCSV,
} from "../../../api/dashboard";

export function useDashboardForm() {
    const { tier } = useContext(AuthContext);

    const [overview, setOverview] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load everything on mount
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);

            try {
                const [overviewData, menuItemList] = await Promise.all([
                    getDailyOverview(),
                    getMenuItems(),
                ]);
                setOverview(overviewData);
                setMenuItems(menuItemList);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Menu item actions
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
        setMenuItems((prev) =>
            prev.filter((item) => item.menu_item_id !== id)
        );
    };

    const handleUploadCSV = async (file) => {
        const uploadedItems = await uploadMenuCSV(file);
        setMenuItems((prev) => [...prev, ...uploadedItems]);
    };

    return {
        tier,
        overview,
        menuItems,
        loading,
        error,
        handleCreateMenuItem,
        handleUpdateMenuItem,
        handleDeleteMenuItem,
        handleUploadCSV,
    };
}
