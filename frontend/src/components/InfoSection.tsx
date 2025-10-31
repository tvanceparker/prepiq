import React from 'react';
import { Box, Typography, useTheme, SxProps, Theme } from '@mui/material';

interface InfoSectionProps {
  title?: string;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function InfoSection({ title, children, sx = {} }: InfoSectionProps) {
  const theme = useTheme();

  return (
    <Box
      component="section"
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor:
          theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.background.paper,
        boxShadow:
          theme.palette.mode === 'light'
            ? '0 1px 4px rgba(0,0,0,0.1)'
            : '0 1px 4px rgba(0,0,0,0.5)',
        ...sx,
      }}
    >
      {title && (
        <Typography
          variant="h5"
          component="h2"
          sx={{
            mb: 2,
            fontWeight: 600,
          }}
        >
          {title}
        </Typography>
      )}

      <Box
        sx={{
          fontSize: '1rem',
          lineHeight: 1.6,
          '& > *:not(:last-child)': {
            mb: 1.5,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
