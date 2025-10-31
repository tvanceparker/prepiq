import React from 'react';
import { Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface EditButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export default function EditButton({ onClick, disabled = false, label = 'Edit' }: EditButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="contained"
      color="primary"
      size="small"
      startIcon={<EditIcon />}
    >
      {label}
    </Button>
  );
}
