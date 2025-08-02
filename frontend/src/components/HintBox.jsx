import React from "react";
import { Paper, Typography, useTheme } from "@mui/material";

export default function HintBox({ title, children, link }) {
  const theme = useTheme();

  return (
    <Paper
      elevation={1}
      sx={{
        position: "relative",
        paddingLeft: 3,
        paddingTop: 2,
        paddingBottom: 2,
        paddingRight: 2,
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : theme.palette.action.hover, // light blue-ish bg on light mode
        color:
          theme.palette.mode === "dark"
            ? theme.palette.text.primary
            : theme.palette.primary.dark,
        overflow: "hidden",
        transition: "box-shadow 0.3s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: theme.shadows[8],
          transform: "scale(1.02)",
        },
        // Left color bar (like your before: pseudo-element)
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 6,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(to bottom, ${theme.palette.secondary.dark}, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`
              : `linear-gradient(to bottom, ${theme.palette.primary.light}, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          transition: "transform 0.5s ease",
          transformOrigin: "top left",
        },
        "&:hover::before": {
          transform: "translateY(-10%) scaleY(1.1)",
        },
      }}
    >
      {title && (
        <Typography
          variant="h6"
          component="h2"
          sx={{
            mb: 1,
            color:
              theme.palette.mode === "dark"
                ? theme.palette.primary.light
                : theme.palette.primary.dark,
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
      )}
      <Typography
        variant="body2"
        sx={{
          color:
            theme.palette.mode === "dark"
              ? theme.palette.text.secondary
              : theme.palette.primary.dark,
          lineHeight: 1.5,
        }}
      >
        {children}
      </Typography>
      {link && (
        <a
          href={link.href}
          style={{
            marginTop: 16,
            display: "inline-block",
            color:
              theme.palette.mode === "dark"
                ? theme.palette.secondary.light
                : theme.palette.primary.main,
            fontWeight: 500,
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          {link.label}
        </a>
      )}
    </Paper>
  );
}
