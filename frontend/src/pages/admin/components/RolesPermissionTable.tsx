import React from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  TextField,
  Tooltip,
  Typography,
  Box,
  Button,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function RolesPermissionsTable({
  roles,
  permissions,
  updateRoleField,
  togglePermission,
  handleDeleteRole,
}) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        maxHeight: 600,
        border: (theme) =>
          `1px solid ${
            theme.palette.mode === "dark"
              ? theme.palette.divider
              : theme.palette.divider
          }`,
        borderRadius: 1,
        minWidth: 700,
      }}
    >
      <Table stickyHeader size="small" aria-label="roles and permissions table">
        <TableHead
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === "dark"
                ? theme.palette.background.paper
                : theme.palette.background.default,
          }}
        >
          <TableRow>
            <TableCell sx={{ minWidth: 200 }}>Role</TableCell>
            {permissions.map((perm) => (
              <TableCell
                key={perm.name}
                align="center"
                sx={{ width: 64, whiteSpace: "nowrap" }}
              >
                <Tooltip title={perm.description || "No description"} arrow>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "help",
                    }}
                  >
                    <Typography variant="body2" noWrap>
                      {perm.name}
                    </Typography>
                    <InfoOutlinedIcon fontSize="small" color="action" />
                  </Box>
                </Tooltip>
              </TableCell>
            ))}
            <TableCell align="center" sx={{ width: 100 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={permissions.length + 2}
                align="center"
                sx={{ py: 4, color: "text.secondary" }}
              >
                No roles available.
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role, i) => {
              const isAdmin = role.name === "Admin";

              return (
                <TableRow
                  key={role.role_id || i}
                  sx={{
                    bgcolor:
                      i % 2 === 0 ? "background.paper" : "background.default",
                  }}
                >
                  <TableCell sx={{ minWidth: 200, py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        width: "100%",
                        minWidth: 300,
                      }}
                    >
                      <TextField
                        size="small"
                        variant="outlined"
                        value={role.name}
                        onChange={(e) =>
                          updateRoleField(i, "name", e.target.value)
                        }
                        placeholder="Role name"
                        disabled={isAdmin}
                        fullWidth
                      />
                      <TextField
                        size="small"
                        variant="outlined"
                        value={role.description}
                        onChange={(e) =>
                          updateRoleField(i, "description", e.target.value)
                        }
                        placeholder="Description"
                        disabled={isAdmin}
                        fullWidth
                      />
                    </Box>
                  </TableCell>

                  {permissions.map((perm) => {
                    const checked = role.permission_names.includes(perm.name);
                    return (
                      <TableCell
                        key={perm.name}
                        align="center"
                        sx={{ width: 64, py: 1 }}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={() => togglePermission(i, perm.name)}
                          disabled={isAdmin}
                          inputProps={{
                            "aria-label": `${perm.name} permission for role ${role.name}`,
                          }}
                        />
                      </TableCell>
                    );
                  })}

                  <TableCell align="center" sx={{ py: 1 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteRole(i)}
                      disabled={isAdmin}
                      aria-label={`Delete role ${role.name}`}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
