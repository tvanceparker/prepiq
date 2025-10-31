// src/interfaces/prep.ts
import type { AlertColor } from '@mui/material';

export interface PrepScheduleState {
  createQuantity: number | string;
  updateTime: number | string;
  updateBatchCount: number | string;
  updateStatus: string;
}

export interface BatchRecipeSnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}
