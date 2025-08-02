import React from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

export default function FormRow({
  label,
  type = "text",
  value,
  onChange,
  name,
  placeholder,
  required = false,
  disabled = false,
  step,
  min,
  max,
  error = "",
  children,
  toggleLabel,
  toggleChecked,
  onToggleChange,
  toggleClassName = "",
}) {
  // For select, MUI requires value and children to be MenuItem components
  // For floating labels, use InputLabel + FormControl wrapping input/select

  return (
    <FormControl
      fullWidth
      required={required}
      disabled={disabled}
      error={!!error}
      margin="normal"
    >
      {type === "select" ? (
        <>
          <InputLabel id={`${name}-label`}>{label}</InputLabel>
          <Select
            labelId={`${name}-label`}
            id={name}
            name={name}
            value={value}
            label={label}
            onChange={onChange}
            placeholder={placeholder}
            inputProps={{ step, min, max }}
          >
            {children}
          </Select>
          {error && <FormHelperText>{error}</FormHelperText>}
        </>
      ) : (
        <>
          <TextField
            id={name}
            name={name}
            label={label}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            step={step}
            inputProps={{ min, max }}
            error={!!error}
            helperText={error}
            variant="outlined"
            fullWidth
          />
        </>
      )}

      {/* Optional toggle checkbox */}
      {toggleLabel && typeof toggleChecked === "boolean" && onToggleChange && (
        <FormControlLabel
          className={toggleClassName}
          control={
            <Checkbox
              checked={toggleChecked}
              onChange={onToggleChange}
              color="primary"
            />
          }
          label={toggleLabel}
        />
      )}
    </FormControl>
  );
}
