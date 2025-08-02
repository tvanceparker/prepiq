import React, { useState, useMemo } from "react";
import { useEmployees } from "../hooks/useEmployees";
import UserManagementBasicModal from "./UserManagementBasicModal";
import Button from "../../../components/Button";
import {
  Box,
  Typography,
  Stack,
  Snackbar,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";

export default function UserManagementBasic() {
  const {
    employees,
    roles,
    loading,
    error,
    fetchEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
  } = useEmployees();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [filterStatus, setFilterStatus] = useState("active"); // active/inactive filter

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const openModal = (employee = null) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (editingEmployee) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await editEmployee(editingEmployee.employee_id, updateData);
        showSnackbar("Employee updated successfully!");
      } else {
        await addEmployee(formData);
        showSnackbar("Employee added successfully!");
      }
      await fetchEmployees();
      setModalOpen(false);
    } catch (err) {
      showSnackbar("Error saving employee: " + (err.message || err), "error");
    }
  };

  const handleDisable = async (employeeId) => {
    if (window.confirm("Are you sure you want to disable this employee?")) {
      try {
        await removeEmployee(employeeId);
        showSnackbar("Employee disabled successfully!");
        await fetchEmployees();
      } catch (err) {
        showSnackbar(
          "Error disabling employee: " + (err.message || err),
          "error"
        );
      }
    }
  };

  // Filter employees by active/inactive status
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) =>
      filterStatus === "active" ? emp.is_active : !emp.is_active
    );
  }, [employees, filterStatus]);

  // Prepare rows data with role info
  const rows = useMemo(() => {
    return filteredEmployees.map((emp) => {
      const role = roles.find((r) => r.role_id === emp.role_id);
      return {
        id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        username: emp.username,
        phone: emp.phone,
        pay_rate: emp.pay_rate,
        employment_type: emp.employment_type,
        role: role ? role.name : "—",
        is_active: emp.is_active,
        _raw: emp,
        _isAdmin: role?.name === "Admin",
      };
    });
  }, [filteredEmployees, roles]);

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
      <Typography variant="h5" mb={2}>
        User Management
      </Typography>

      {/* Active / Inactive Filter Toggle */}
      <Box mb={2}>
        <ToggleButtonGroup
          value={filterStatus}
          exclusive
          onChange={(_, val) => val && setFilterStatus(val)}
          aria-label="Filter employees by active status"
          size="small"
        >
          <ToggleButton value="active" aria-label="Show active employees">
            Active
          </ToggleButton>
          <ToggleButton value="inactive" aria-label="Show inactive employees">
            Inactive
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box mb={2}>
        <Button
          showIcon={false}
          variant="confirm"
          onClick={() => openModal()}>
          Add Employee
        </Button>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error.message || "An error occurred"}
        </Typography>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 5,
          }}
        >
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Typography>No employees found.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader aria-label="Employees table" size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Pay Rate</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.pay_rate}</TableCell>
                  <TableCell>{row.employment_type}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        showIcon={false}
                        variant="edit"
                        size="sm"
                        onClick={() => openModal(row._raw)}
                        disabled={row._isAdmin}
                      >
                        Edit
                      </Button>
                      {row.is_active && (
                        <Button
                          showIcon={false}
                          variant="delete"
                          size="sm"
                          onClick={() => handleDisable(row.id)}
                          disabled={row._isAdmin}
                        >
                          Disable
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserManagementBasicModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        employee={editingEmployee}
        roles={roles}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
      />

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
