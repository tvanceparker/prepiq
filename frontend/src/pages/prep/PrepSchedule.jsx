import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";

import {
  usePrepSchedules,
  useCreatePrepSchedule,
  useUpdatePrepSchedule,
  useBatchRecipes,
} from "./hooks/usePrepSchedule";

export default function PrepSchedule() {
  // Load batch recipes and prep schedules with hooks
  const {
    data: batchRecipes,
    loading: loadingBatchRecipes,
    error: errorBatchRecipes,
  } = useBatchRecipes();

  const {
    data: prepSchedules,
    loading: loadingPrepSchedules,
    error: errorPrepSchedules,
    refetch: refetchPrepSchedules,
  } = usePrepSchedules();

  // Create and update hooks
  const { create: createPrep, loading: loadingCreate } =
    useCreatePrepSchedule();
  const { update: updatePrep, loading: loadingUpdate } =
    useUpdatePrepSchedule();

  // Local UI state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedBatchRecipe, setSelectedBatchRecipe] = useState(null);
  const [selectedPrepSchedule, setSelectedPrepSchedule] = useState(null);

  const [createQuantity, setCreateQuantity] = useState("");
  const [updateStatus, setUpdateStatus] = useState("in_progress");
  const [updateTime, setUpdateTime] = useState("");
  const [updateBatchCount, setUpdateBatchCount] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Create dialog handlers
  const handleOpenCreateDialog = (batchRecipe) => {
    setSelectedBatchRecipe(batchRecipe);
    setCreateQuantity("");
    setCreateDialogOpen(true);
  };
  const handleCloseCreateDialog = () => setCreateDialogOpen(false);

  const handleCreatePrepSchedule = async () => {
    if (!createQuantity || isNaN(createQuantity) || createQuantity <= 0) {
      setSnackbar({
        open: true,
        message: "Please enter a valid quantity",
        severity: "warning",
      });
      return;
    }
    try {
      await createPrep({
        batch_recipe_id: selectedBatchRecipe.batch_recipe_id,
        quantity_needed: Number(createQuantity),
        prep_date: new Date().toISOString().split("T")[0], // today
      });
      setSnackbar({
        open: true,
        message: "Prep schedule created",
        severity: "success",
      });
      setCreateDialogOpen(false);
      refetchPrepSchedules();
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Failed to create prep schedule",
        severity: "error",
      });
    }
  };

  // Update dialog handlers
  const handleOpenUpdateDialog = (prep) => {
    setSelectedPrepSchedule(prep);
    setUpdateStatus(prep.status === "completed" ? "completed" : "in_progress");
    setUpdateTime(prep.prep_time_minutes_actual || "");
    setUpdateBatchCount(prep.prep_batch_count || "");
    setUpdateDialogOpen(true);
  };
  const handleCloseUpdateDialog = () => setUpdateDialogOpen(false);

  const handleUpdatePrepSchedule = async () => {
    if (updateStatus === "completed") {
      if (!updateTime || isNaN(updateTime) || updateTime <= 0) {
        setSnackbar({
          open: true,
          message: "Please enter a valid actual time",
          severity: "warning",
        });
        return;
      }
      if (
        !updateBatchCount ||
        isNaN(updateBatchCount) ||
        updateBatchCount <= 0
      ) {
        setSnackbar({
          open: true,
          message: "Please enter a valid batch count",
          severity: "warning",
        });
        return;
      }
    }

    try {
      await updatePrep({
        prep_id: selectedPrepSchedule.prep_id,
        status: updateStatus,
        prep_time_minutes_actual:
          updateStatus === "completed" ? Number(updateTime) : null,
        prep_batch_count:
          updateStatus === "completed" ? Number(updateBatchCount) : null,
      });
      setSnackbar({
        open: true,
        message: "Prep schedule updated",
        severity: "success",
      });
      setUpdateDialogOpen(false);
      refetchPrepSchedules();
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Failed to update prep schedule",
        severity: "error",
      });
    }
  };

  const loading =
    loadingBatchRecipes ||
    loadingPrepSchedules ||
    loadingCreate ||
    loadingUpdate;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (errorBatchRecipes || errorPrepSchedules) {
    return (
      <Box sx={{ mt: 5 }}>
        <Alert severity="error">
          Failed to load data. Please refresh or try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h3" gutterBottom>
        Prep Schedule Management
      </Typography>

      {/* Batch Recipes */}
      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Batch Recipes
      </Typography>
      {batchRecipes.length === 0 ? (
        <Typography>No batch recipes found.</Typography>
      ) : (
        <Grid container spacing={3}>
          {batchRecipes.map((batch) => (
            <Grid item xs={12} sm={6} md={4} key={batch.batch_recipe_id}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.15s ease-in-out",
                  "&:hover": { transform: "scale(1.05)" },
                }}
                onClick={() => handleOpenCreateDialog(batch)}
                variant="outlined"
              >
                <CardContent>
                  <Typography variant="h6">{batch.name}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {batch.description || "No description"}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    Yield: {batch.yield_quantity} {batch.yield_unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Estimated Prep Time:{" "}
                    {batch.estimated_prep_time_minutes ?? "-"} mins
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Prep Schedules */}
      <Typography variant="h5" sx={{ mt: 6, mb: 2 }}>
        Current Prep Schedules
      </Typography>
      {prepSchedules.length === 0 ? (
        <Typography>No prep schedules found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table aria-label="prep schedule table" size="small">
            <TableHead>
              <TableRow>
                <TableCell>Batch Recipe</TableCell>
                <TableCell>Prep Date</TableCell>
                <TableCell>Quantity Needed</TableCell>
                <TableCell>Quantity Prepped</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Estimated Time (min)</TableCell>
                <TableCell>Actual Time (min)</TableCell>
                <TableCell>Batch Count</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prepSchedules.map((prep) => (
                <TableRow key={prep.prep_id} hover>
                  <TableCell>{prep.batch_recipe_name || "Unknown"}</TableCell>
                  <TableCell>{prep.prep_date}</TableCell>
                  <TableCell>{prep.quantity_needed}</TableCell>
                  <TableCell>{prep.quantity_prepped}</TableCell>
                  <TableCell>
                    <Chip
                      label={prep.status}
                      color={
                        prep.status === "completed"
                          ? "success"
                          : prep.status === "in_progress"
                          ? "info"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{prep.estimated_time ?? "-"}</TableCell>
                  <TableCell>{prep.prep_time_minutes_actual ?? "-"}</TableCell>
                  <TableCell>{prep.prep_batch_count ?? "-"}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenUpdateDialog(prep)}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Prep Schedule Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Prep Schedule</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            {selectedBatchRecipe?.name}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Yield: {selectedBatchRecipe?.yield_quantity}{" "}
            {selectedBatchRecipe?.yield_unit}
          </Typography>
          <TextField
            label="Quantity Needed"
            type="number"
            value={createQuantity}
            onChange={(e) => setCreateQuantity(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ min: 1 }}
            sx={{ mt: 2 }}
            disabled={loadingCreate}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog} disabled={loadingCreate}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreatePrepSchedule}
            disabled={loadingCreate}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Prep Schedule Dialog */}
      <Dialog
        open={updateDialogOpen}
        onClose={handleCloseUpdateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Update Prep Schedule</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            {selectedPrepSchedule?.batch_recipe_name} -{" "}
            {selectedPrepSchedule?.prep_date}
          </Typography>
          <Typography variant="body2" gutterBottom>
            Current Status:{" "}
            <Chip label={selectedPrepSchedule?.status} size="small" />
          </Typography>

          {/* Status toggle */}
          <Box sx={{ mt: 1, mb: 2 }}>
            <Button
              variant={
                updateStatus === "in_progress" ? "contained" : "outlined"
              }
              onClick={() => setUpdateStatus("in_progress")}
              sx={{ mr: 1 }}
              disabled={loadingUpdate}
            >
              In Progress
            </Button>
            <Button
              variant={updateStatus === "completed" ? "contained" : "outlined"}
              onClick={() => setUpdateStatus("completed")}
              disabled={loadingUpdate}
            >
              Completed
            </Button>
          </Box>

          {/* If completed, show fields for time and batch count */}
          {updateStatus === "completed" && (
            <>
              <TextField
                label="Actual Prep Time (minutes)"
                type="number"
                value={updateTime}
                onChange={(e) => setUpdateTime(e.target.value)}
                fullWidth
                inputProps={{ min: 1 }}
                sx={{ mb: 2 }}
                disabled={loadingUpdate}
              />
              <TextField
                label="Batch Count"
                type="number"
                value={updateBatchCount}
                onChange={(e) => setUpdateBatchCount(e.target.value)}
                fullWidth
                inputProps={{ min: 1 }}
                disabled={loadingUpdate}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpdateDialog} disabled={loadingUpdate}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdatePrepSchedule}
            disabled={loadingUpdate}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
