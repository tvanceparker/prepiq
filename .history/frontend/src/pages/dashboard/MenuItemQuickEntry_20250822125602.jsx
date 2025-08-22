import React, { useState, useMemo, useEffect } from "react";
import { useDashboardForm } from "./hooks/useDashboardForm";
// Replaces top-centered modal with a bottom-anchored drawer for add/edit
import MenuItemBottomSheet from "./components/MenuItemBottomSheet";
import BulkUploadModal from "./components/BulkUploadModal";
import MenuItemTable from "./components/MenuItemTable";
import FilterButtons from "../../components/FilterButtons";
import { PageHeader } from "../../components/PageHeader";
import MuiButton from "../../components/Button";
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  Paper
} from "@mui/material";

export default function MenuItemQuickEntry() {
  const theme = useTheme();
  const {
    menuItems,
    loading,
    handleCreateMenuItem,
    handleUpdateMenuItem,
    handleDeleteMenuItem,
    handleUploadCSV,
  } = useDashboardForm();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const categoryItems = useMemo(() => {
    const categories = new Set(menuItems.map((item) => item.category));
    return Array.from(categories).map((cat) => ({ id: cat, name: cat }));
  }, [menuItems]);

  const [selectedCategories, setSelectedCategories] = useState(() =>
    categoryItems.map((c) => c.id)
  );

  const statusItems = [
    { id: "active", name: "Active" },
    { id: "inactive", name: "Inactive" },
  ];

  const [selectedStatus, setSelectedStatus] = useState(() => ["active"]);

  useEffect(() => {
    setSelectedCategories(categoryItems.map((c) => c.id));
  }, [categoryItems]);

  const filteredMenuItems = useMemo(() => {
    let filtered = menuItems;

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((item) =>
        selectedCategories.includes(item.category)
      );
    }

    if (
      selectedStatus.length > 0 &&
      selectedStatus.length < statusItems.length
    ) {
      filtered = filtered.filter((item) => {
        if (item.is_active && selectedStatus.includes("active")) return true;
        if (!item.is_active && selectedStatus.includes("inactive")) return true;
        return false;
      });
    }

    return filtered;
  }, [menuItems, selectedCategories, selectedStatus]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const onSubmitMenuItem = async (data) => {
    try {
      await handleCreateMenuItem(data);
      showSnackbar("Menu item added successfully!", "success");
      setShowAddModal(false);
    } catch (err) {
      showSnackbar("Failed to add menu item.", "error");
      console.error(err);
    }
  };

  const onUploadFile = async (file) => {
    try {
      await handleUploadCSV(file);
      showSnackbar("Bulk upload successful!", "success");
      setShowUploadModal(false);
    } catch (err) {
      showSnackbar("Bulk upload failed.", "error");
      console.error(err);
    }
  };

  return (
    <Paper
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      <PageHeader title="Menu Item Quick Entry" />
      {/* Filter Buttons */}
      <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FilterButtons
            items={categoryItems}
            selectedItems={selectedCategories}
            setSelectedItems={setSelectedCategories}
            label="Filter by Category"
            allLabel="All Categories"
          />

          <FilterButtons
            items={statusItems}
            selectedItems={selectedStatus}
            setSelectedItems={setSelectedStatus}
            label="Filter by Status"
          />
        </Stack>
      </Paper>
      <Paper elevation={4} sx={{ p: 3 }}>
        {loading ? (
          <Box textAlign="center" mt={5}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Two-column simple responsive grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              {filteredMenuItems.map((item) => (
                <Paper key={item.menu_item_id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.category || 'Uncategorized'} • ${item.price ?? 0}
                      </Typography>
                      <Typography variant="caption" color={item.is_active ? 'success.main' : 'error.main'}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <MuiButton
                        size="small"
                        onClick={() => setEditItem(item)}
                        variant="outlined"
                      >
                        Edit
                      </MuiButton>
                      <MuiButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          try {
                            await handleDeleteMenuItem(item.menu_item_id);
                            showSnackbar('Menu item deleted', 'success');
                          } catch (e) {
                            console.error(e);
                            showSnackbar('Failed to delete item', 'error');
                          }
                        }}
                      >
                        Delete
                      </MuiButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <MuiButton variant="contained" onClick={() => setShowAddModal(true)}>
                Add Menu Item
              </MuiButton>
            </Box>
          </Box>
        )}
      </Paper>

      <MenuItemBottomSheet
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={onSubmitMenuItem}
      />
      <MenuItemBottomSheet
        open={!!editItem}
        initial={editItem}
        onClose={() => setEditItem(null)}
        onSubmit={async (data) => {
          try {
            await handleUpdateMenuItem({ ...editItem, ...data });
            setEditItem(null);
            showSnackbar('Menu item updated', 'success');
          } catch (e) {
            console.error(e);
            showSnackbar('Failed to update item', 'error');
          }
        }}
      />
      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={onUploadFile}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
