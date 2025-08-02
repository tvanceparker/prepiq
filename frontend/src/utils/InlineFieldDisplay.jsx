import React from "react";
import { Typography, Box } from "@mui/material";

const InlineFieldDisplay = ({ fields = [] }) => (
  <Box
    sx={{
      mt: 0.5,
      fontSize: "0.8rem",
      color: "text.secondary",
      display: "flex",
      flexWrap: "wrap", // allow wrap but aligned left
      gap: 1,
      justifyContent: "flex-start", // left align fields container
      width: "100%", // take full width of parent container
    }}
  >
    {fields.map(({ label, value }, index) => (
      <Box
        key={label}
        sx={{
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap", // keep label + value together on same line
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          component="span"
          sx={{ fontSize: "0.8rem" }}
        >
          {label}:
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            color: "text.primary",
            ml: 0.5,
            fontSize: "0.8rem",
          }}
        >
          {value}
        </Typography>
        {index < fields.length - 1 && (
          <Typography
            variant="caption"
            sx={{ mx: 1, color: "text.disabled", fontSize: "0.8rem" }}
          >
            |
          </Typography>
        )}
      </Box>
    ))}
  </Box>
);


export default InlineFieldDisplay;
