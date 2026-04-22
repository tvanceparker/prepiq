import React from 'react';
import { Box, Button, TextField } from '@mui/material';

interface AssistantComposerProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function AssistantComposer({
  value,
  disabled = false,
  onChange,
  onSubmit,
}: AssistantComposerProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
        p: 1,
        borderRadius: 2.5,
        bgcolor: theme =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(104, 72, 18, 0.04)',
        border: theme =>
          `1px solid ${
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(104, 72, 18, 0.12)'
          }`,
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={4}
        size="small"
        placeholder="Ask Chef Garlic about docs, forecasts, or restaurant ops"
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        hiddenLabel
        inputProps={{ 'aria-label': 'Ask Chef Garlic' }}
        sx={{
          '& .MuiOutlinedInput-root': {
            alignItems: 'flex-start',
            borderRadius: 2,
            bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.9)' : '#fffdf8'),
          },
          '& .MuiOutlinedInput-input': {
            color: 'text.primary',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(104, 72, 18, 0.15)',
          },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.24)' : 'rgba(104, 72, 18, 0.24)',
          },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme => (theme.palette.mode === 'dark' ? '#d5b26f' : '#8f621b'),
          },
          '& .MuiInputBase-input::placeholder': {
            opacity: 1,
            color: 'text.secondary',
          },
        }}
      />
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        sx={{ minWidth: 88, height: 40, borderRadius: 2 }}
      >
        Send
      </Button>
    </Box>
  );
}
