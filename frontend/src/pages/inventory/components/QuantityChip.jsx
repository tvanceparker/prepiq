import React from "react";
import { Chip } from "@mui/material";

const colorMap = {
  added: "success",
  used: "error",
  wasted: "warning",
};

const QuantityChip = ({ label, quantity, type, onClick }) => (
  <Chip
    label={`${label}: ${quantity}`}
    color={colorMap[type]}
    size="small"
    sx={{ marginRight: 1, cursor: "pointer" }}
    onClick={onClick}
  />
);

export default QuantityChip;
