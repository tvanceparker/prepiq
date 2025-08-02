// components/GlobalSnackbar.jsx
import { Snackbar, Alert } from "@mui/material";
import { useUIStore } from "../stores/uiStore";

export default function GlobalSnackbar() {
  const { snackbar, closeSnackbar } = useUIStore();

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={(_, reason) => {
        if (reason !== "clickaway") closeSnackbar();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={closeSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
}
