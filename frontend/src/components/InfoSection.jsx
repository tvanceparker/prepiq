// src/components/InfoSection.jsx
import React from "react";
import { Box, Typography, useTheme } from "@mui/material";

export default function InfoSection({ title, children, sx = {} }) {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor:
          theme.palette.mode === "light"
            ? theme.palette.grey[100]
            : theme.palette.background.paper,
        boxShadow:
          theme.palette.mode === "light"
            ? "0 1px 4px rgba(0,0,0,0.1)"
            : "0 1px 4px rgba(0,0,0,0.5)",
        ...sx,
      }}
    >
      {title && (
        <Typography
          variant="h5"
          component="h2"
          sx={{
            mb: 2,
            fontWeight: 600,
            color:
              theme.palette.mode === "light"
                ? theme.palette.text.primary
                : theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
      )}

      <Box
        sx={{
          color:
            theme.palette.mode === "light"
              ? theme.palette.text.secondary
              : theme.palette.text.secondary,
          fontSize: "1rem",
          lineHeight: 1.6,
          "& > *:not(:last-child)": {
            mb: 1.5,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
