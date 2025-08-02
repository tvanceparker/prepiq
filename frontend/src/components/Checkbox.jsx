import React from "react";
import { Checkbox as MUICheckbox, FormControlLabel } from "@mui/material";

export default function Checkbox({
  checked,
  onChange,
  disabled = false,
  label = "",
  id,
  className = "",
}) {
  return (
    <FormControlLabel
      control={
        <MUICheckbox
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={className}
          size="small" // optional: adjust size if you want smaller/larger
        />
      }
      label={label}
      htmlFor={id}
      disabled={disabled}
      sx={{
        userSelect: "none",
        "& .MuiFormControlLabel-label": {
          color: disabled ? "text.disabled" : "text.primary",
          fontSize: 14,
        },
      }}
    />
  );
}
