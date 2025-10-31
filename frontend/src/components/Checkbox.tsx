import React from 'react';
import { Checkbox as MUICheckbox, FormControlLabel } from '@mui/material';
import type { CheckboxProps } from '../interfaces/table';

export default function Checkbox({
  checked,
  onChange,
  disabled = false,
  label = '',
  id,
  className = '',
}: CheckboxProps): JSX.Element {
  return (
    <FormControlLabel
      control={
        <MUICheckbox
          id={id}
          checked={checked}
          onChange={(e, v) => onChange(e, v)}
          disabled={disabled}
          className={className}
          size="small"
        />
      }
      label={label}
      htmlFor={id}
      disabled={disabled}
      sx={{
        userSelect: 'none',
        '& .MuiFormControlLabel-label': {
          color: disabled ? 'text.disabled' : 'text.primary',
          fontSize: 14,
        },
      }}
    />
  );
}
