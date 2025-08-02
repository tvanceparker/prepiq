import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginForm } from "./hooks/useLoginForm";
import { AuthContext } from "../../contexts/AuthContext";

import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
} from "@mui/material";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { handleLogin, loading, errorMsg } = useLoginForm();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate("/dashboard/daily-overview");
    }
  }, [token, navigate]);

  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 400,
          width: "100%",
          borderRadius: 2,
          bgcolor: "background.paper",
          boxShadow: (theme) => theme.shadows[6],
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{ mb: 3, fontWeight: "bold", color: "text.primary" }}
        >
          Login to PrepIQ
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            required
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            required
            margin="normal"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {errorMsg && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errorMsg}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 3, py: 1.5, fontWeight: "600" }}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
