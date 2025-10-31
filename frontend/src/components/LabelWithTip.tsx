import React from 'react';
import { Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from './Tooltip';
import type { LabelWithTipProps } from '../interfaces/ui';

export default function LabelWithTip({
  label,
  tipContent,
  className = '',
}: LabelWithTipProps): JSX.Element {
  return (
    <Box
      component="label"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'text.primary',
        cursor: 'default',
        userSelect: 'none',
      }}
      className={className}
    >
      <Typography component="span">{label}</Typography>
      <Tooltip content={tipContent}>
        <InfoOutlinedIcon
          aria-hidden="true"
          tabIndex={-1}
          sx={{ fontSize: 18, color: 'primary.main', cursor: 'help' }}
        />
      </Tooltip>
    </Box>
  );
}
