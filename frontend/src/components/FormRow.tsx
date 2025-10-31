import React from 'react';
import {
  TextField,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Checkbox as MUICheckbox,
  FormControlLabel,
} from '@mui/material';
import type { FormRowProps } from '../interfaces/ui';

export default function FormRow({
  label,
  type = 'text',
  value,
  onChange,
  name,
  placeholder,
  required = false,
  disabled = false,
  step,
  min,
  max,
  error = '',
  children,
  toggleLabel,
  toggleChecked,
  onToggleChange,
  toggleClassName = '',
}: FormRowProps): JSX.Element {
  return (
    <FormControl fullWidth required={required} disabled={disabled} error={!!error} margin="normal">
      {type === 'select' ? (
        <>
          <InputLabel id={`${name}-label`}>{label}</InputLabel>
          <Select
            labelId={`${name}-label`}
            id={name}
            name={name}
            value={value}
            label={label as any}
            onChange={onChange as any}
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
            label={label as any}
            type={type}
            value={value}
            onChange={onChange as any}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            inputProps={{ min, max, step }}
            error={!!error}
            helperText={error}
            variant="outlined"
            fullWidth
          />
        </>
      )}

      {toggleLabel && typeof toggleChecked === 'boolean' && onToggleChange && (
        <FormControlLabel
          className={toggleClassName}
          control={
            <MUICheckbox checked={toggleChecked} onChange={onToggleChange} color="primary" />
          }
          label={toggleLabel}
        />
      )}
    </FormControl>
  );
}
