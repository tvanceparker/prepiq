import React from 'react';
import { Typography, Box } from '@mui/material';
import type { InlineFieldDisplayProps } from '../interfaces/ui';

const InlineFieldDisplay = ({ fields = [] }: InlineFieldDisplayProps): JSX.Element => (
  <Box
    sx={{
      mt: 0.5,
      fontSize: '0.8rem',
      color: 'text.secondary',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 1,
      justifyContent: 'flex-start',
      width: '100%',
    }}
  >
    {fields.map(({ label, value }, index) => (
      <Box key={label} sx={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          component="span"
          sx={{ fontSize: '0.8rem' }}
        >
          {label}:
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 500, color: 'text.primary', ml: 0.5, fontSize: '0.8rem' }}
        >
          {value}
        </Typography>
        {index < fields.length - 1 && (
          <Typography variant="caption" sx={{ mx: 1, color: 'text.disabled', fontSize: '0.8rem' }}>
            |
          </Typography>
        )}
      </Box>
    ))}
  </Box>
);

export default InlineFieldDisplay;
