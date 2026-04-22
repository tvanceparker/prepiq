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
            bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
            color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
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
                <Typography key={`${citation.label}-${index}`} variant="caption" display="block">
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
