// components/Tag.jsx
import React from "react";
import Chip from "@mui/material/Chip";

export default function Tag({ children, color = "primary" }) {
  // MUI's Chip supports these colors out of the box:
  // primary, secondary, error, info, success, warning
  // For your custom 'accent', 'muted', map to one of these or default
  const colorMap = {
    primary: "primary",
    secondary: "secondary",
    accent: "info",
    muted: "default", // MUI 'default' Chip is neutral gray
    danger: "error",
    success: "success",
  };

  // Map your color to MUI Chip color, fallback to primary
  const muiColor = colorMap[color] || "primary";

  // For muted/default color, you might want to use variant='outlined'
  const variant = muiColor === "default" ? "outlined" : "filled";

  return (
    <Chip
      label={children}
      color={muiColor !== "default" ? muiColor : undefined}
      variant={variant}
      size="small"
      sx={{ fontWeight: 600, fontSize: 12 }}
    />
  );
}
