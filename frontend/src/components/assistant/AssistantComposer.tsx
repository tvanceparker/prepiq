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
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        size="small"
        label="Ask PrepIQ"
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
      />
      <Button variant="contained" onClick={onSubmit} disabled={disabled || !value.trim()}>
        Send
      </Button>
    </Box>
  );
}
