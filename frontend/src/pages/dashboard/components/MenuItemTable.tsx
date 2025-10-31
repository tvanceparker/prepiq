import React, { useState } from "react";
import MenuItemModal from "./MenuItemModal";

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";

import MuiButton from "../../../components/Button"; // your permission-aware button

export default function MenuItemTable({
  menuItems,
  loading,
  handleUpdateMenuItem,
  handleDeleteMenuItem,
  handleAddMenuItem,
  showSnackbar,
}) {
  const [mode, setMode] = useState("table"); // could toggle between "table" or "card"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
const categories = Array.from(
  new Set(menuItems.map((item) => item.category).filter(Boolean))
);

  const columns = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price" },
  ];

  const openNewModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleModalSubmit = async (itemData) => {
    try {
      if (editingItem) {
        await handleUpdateMenuItem(editingItem.menu_item_id, itemData);
        showSnackbar("Menu item updated", "success");
      } else {
        await handleAddMenuItem(itemData);
        showSnackbar("Menu item added", "success");
      }
      closeModal();
    } catch {
      showSnackbar("Failed to save menu item", "error");
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await handleUpdateMenuItem(item.menu_item_id, {
        ...item,
        is_active: !item.is_active,
      });
      showSnackbar(
        item.is_active ? "Item deactivated" : "Item reactivated",
        "info"
      );
    } catch {
      showSnackbar("Action failed", "error");
    }
  };

  const renderCards = () =>
    menuItems.map((item) => (
      <Card key={item.menu_item_id} sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6">{item.name}</Typography>
            <Typography variant="body2">{item.category}</Typography>
            <Typography variant="body2">${item.price.toFixed(2)}</Typography>

            <Stack direction="row" spacing={1}>
              <MuiButton
                variant="edit"
                requiredPermission="edit_menu"
                onClick={() => openEditModal(item)}
              >
                Edit
              </MuiButton>

              <MuiButton
                variant={item.is_active ? "cancel" : "confirm"}
                onClick={() => handleToggleActive(item)}
              >
                {item.is_active ? "Deactivate" : "Reactivate"}
              </MuiButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    ));

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <MuiButton
          variant="create"
          requiredPermission="edit_menu"
          onClick={openNewModal}
        >
          Add New Item
        </MuiButton>
      </Stack>

      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : mode === "table" ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{ width: `${100 / (columns.length + 1)}%` }}
                  >
                    {col.label}
                  </TableCell>
                ))}
                <TableCell sx={{ width: `${100 / (columns.length + 1)}%` }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menuItems.map((item) => (
                <TableRow key={item.menu_item_id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <MuiButton
                        variant="edit"
                        requiredPermission="edit_menu"
                        onClick={() => openEditModal(item)}
                      >
                        Edit
                      </MuiButton>

                      <MuiButton
                        variant={item.is_active ? "cancel" : "confirm"}
                        requiredPermission="edit_menu"
                        onClick={() => handleToggleActive(item)}
                      >
                        {item.is_active ? "Deactivate" : "Reactivate"}
                      </MuiButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        renderCards()
      )}

      <MenuItemModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        initialData={editingItem}
        categories={categories}
      />
    </Box>
  );
}
