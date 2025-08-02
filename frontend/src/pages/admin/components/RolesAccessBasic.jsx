import React, { useState, useEffect } from "react";
import { useRolePermissions } from "../hooks/useRolePermissions";
import RolesPermissionsTable from "./RolesPermissionTable";
import { PageHeader } from "../../../components/PageHeader";
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Paper,
} from "@mui/material";

import Button from "../../../components/Button"; // use your custom button

export default function RolesPermissionsBasic() {
  const { roles, permissions, loading, error, syncData, deleteRole } =
    useRolePermissions();

  const [localRoles, setLocalRoles] = useState([]);
  const [initialRoles, setInitialRoles] = useState([]);
  const [deletedRoles, setDeletedRoles] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    if (roles.length) {
      const mapped = roles.map((role) => ({
        ...role,
        permission_names: role.permissions?.map((p) => p.name) || [],
      }));
      setLocalRoles(mapped);
      setInitialRoles(mapped);
    }
  }, [roles]);

  const togglePermission = (roleIndex, permissionName) => {
    setLocalRoles((prev) => {
      if (!prev[roleIndex]) return prev;
      const updated = [...prev];
      const role = updated[roleIndex];
      role.permission_names = role.permission_names.includes(permissionName)
        ? role.permission_names.filter((p) => p !== permissionName)
        : [...role.permission_names, permissionName];
      return updated;
    });
  };

  const updateRoleField = (index, field, value) => {
    setLocalRoles((prev) => {
      if (!prev[index]) return prev;
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const addRole = () => {
    setLocalRoles((prev) => [
      ...prev,
      { role_id: null, name: "", description: "", permission_names: [] },
    ]);
  };

  const openConfirm = (action, payload = null) => {
    setConfirmAction(() => action);
    setConfirmPayload(payload);
    setConfirmOpen(true);
  };

  const cancelChanges = () => {
    openConfirm(() => {
      setLocalRoles(initialRoles);
      setDeletedRoles([]);
    });
  };

  const handleDeleteRole = (index) => {
    const role = localRoles[index];
    openConfirm(async () => {
      try {
        if (role.role_id) await deleteRole(role.role_id);
        setLocalRoles((prev) => prev.filter((_, i) => i !== index));
      } catch (err) {
        showSnackbar("Failed to delete role: " + err.message, "error");
      }
    });
  };

  const saveChanges = async () => {
    try {
      const payload = {
        roles: localRoles.map(
          ({ role_id, name, description, permission_names }) => ({
            ...(role_id && { role_id }),
            name,
            description,
            permission_names,
          })
        ),
        deleted_roles: deletedRoles,
      };
      await syncData(payload.roles, payload.deleted_roles);
      showSnackbar("Roles and permissions synced!", "success");
      setDeletedRoles([]);
    } catch (err) {
      showSnackbar("Failed to sync roles: " + err.message, "error");
    }
  };

  const handleConfirmClose = (confirmed) => {
    setConfirmOpen(false);
    if (confirmed && confirmAction) {
      confirmAction(confirmPayload);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Typography color="error" mt={4} textAlign="center">
        Error: {error.message}
      </Typography>
    );

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
      <PageHeader title="Roles & Access" sx={{ mb: 4 }} />

      <Stack direction="row" spacing={2} mb={4}>
        <Button
          muiVariant="contained"
          requiredPermission="roles"
          variant="edit"
          showIcon={false}
          onClick={addRole}
        >
          Add Role
        </Button>
        <Button
          muiVariant="contained"
          requiredPermission="roles"
          variant="confirm"
          showIcon={false}
          onClick={saveChanges}
        >
          Save Changes
        </Button>
        <Button
          muiVariant="outlined"
          variant="cancel"
          showIcon={false}
          onClick={cancelChanges}
        >
          Cancel
        </Button>
      </Stack>

      <RolesPermissionsTable
        roles={localRoles}
        permissions={permissions}
        updateRoleField={updateRoleField}
        togglePermission={togglePermission}
        handleDeleteRole={handleDeleteRole}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => handleConfirmClose(false)}>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to proceed with this action?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            muiVariant="text"
            variant="cancel"
            showIcon={false}
            onClick={() => handleConfirmClose(false)}
          >
            Cancel
          </Button>
          <Button
            muiVariant="text"
            variant="confirm"
            showIcon={false}
            onClick={() => handleConfirmClose(true)}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
