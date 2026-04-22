import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import type { AssistantChatMessage } from '../../interfaces/assistant';

interface AssistantMessageListProps {
  messages: AssistantChatMessage[];
}

export default function AssistantMessageList({ messages }: AssistantMessageListProps): JSX.Element {
  return (
    <Stack spacing={1.5}>
      {messages.map(message => (
        <Box
          key={message.id}
          sx={{
            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '92%',
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            bgcolor: theme =>
              message.role === 'user'
                ? theme.palette.mode === 'dark'
                  ? 'primary.dark'
                  : 'primary.main'
                : theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.06)'
                  : 'grey.100',
            color: theme =>
              message.role === 'user'
                ? theme.palette.getContrastText(
                    theme.palette.mode === 'dark'
                      ? theme.palette.primary.dark
                      : theme.palette.primary.main
                  )
                : theme.palette.text.primary,
            border: theme =>
              message.role === 'assistant'
                ? `1px solid ${
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(104, 72, 18, 0.08)'
                  }`
                : 'none',
            boxShadow: theme =>
              message.role === 'assistant' && theme.palette.mode === 'dark'
                ? '0 8px 20px rgba(0,0,0,0.18)'
                : 'none',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>

          {message.role === 'assistant' && message.warnings && message.warnings.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {message.warnings.map(warning => (
                <Typography key={warning} variant="caption" display="block" color="warning.main">
                  {warning}
                </Typography>
              ))}
            </Box>
          )}

          {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
            <Box sx={{ mt: 1.25 }}>
              <Typography variant="caption" fontWeight={700} display="block">
                Sources
              </Typography>
              {message.citations.slice(0, 4).map((citation, index) => (
                <Typography
                  key={`${citation.label}-${index}`}
                  variant="caption"
                  display="block"
                  color="text.secondary"
                >
                  {citation.label}
                  {citation.path ? ` • ${citation.path}` : ''}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
