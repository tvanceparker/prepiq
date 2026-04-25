import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';

import type { AssistantChatMessage, AssistantDocument } from '../../interfaces/assistant';
import AssistantComposer from './AssistantComposer';
import ChefGarlicAvatar, { type ChefGarlicMotionState } from './ChefGarlicAvatar';
import AssistantMessageList from './AssistantMessageList';

interface AssistantPanelProps {
  input: string;
  isLoading: boolean;
  isUploading: boolean;
  isRefreshingIndex: boolean;
  error: string | null;
  uploadError: string | null;
  messages: AssistantChatMessage[];
  documents: AssistantDocument[];
  avatarMotionState: ChefGarlicMotionState;
  avatarWaveToken: number;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onUpload: (file: File) => void;
  onReindex: () => void;
}

export default function AssistantPanel({
  input,
  isLoading,
  isUploading,
  isRefreshingIndex,
  error,
  uploadError,
  messages,
  documents,
  avatarMotionState,
  avatarWaveToken,
  onClose,
  onInputChange,
  onSubmit,
  onUpload,
  onReindex,
}: AssistantPanelProps): JSX.Element {
  return (
    <Paper
      elevation={12}
      sx={{
        width: { xs: 'calc(100vw - 24px)', sm: 520, lg: 560 },
        height: { xs: '78vh', sm: 660, lg: 720 },
        maxHeight: 'calc(100vh - 112px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper'),
        border: theme =>
          `1px solid ${
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(104, 72, 18, 0.08)'
          }`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.25,
          py: 1.75,
          background: theme =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(42,32,18,0.98) 0%, rgba(69,50,23,0.98) 100%)'
              : 'linear-gradient(135deg, rgba(250,244,231,1) 0%, rgba(246,229,186,0.96) 100%)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ChefGarlicAvatar motionState={avatarMotionState} waveToken={avatarWaveToken} />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              Chef Garlic
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Live restaurant context plus indexed docs, notes, and uploads
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tap the avatar to make him wave. He perks up while replies are on the way.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} sx={{ color: theme => theme.palette.text.primary }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <Box
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(248, 243, 229, 0.85)',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button
            component="label"
            size="small"
            startIcon={<UploadFileIcon />}
            disabled={isUploading}
            sx={{
              color: theme => (theme.palette.mode === 'dark' ? '#f0d9aa' : 'inherit'),
              borderColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(240,217,170,0.25)' : undefined,
            }}
          >
            Add File
            <input
              hidden
              type="file"
              accept=".md,.txt,.pdf"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) {
                  onUpload(file);
                }
                event.currentTarget.value = '';
              }}
            />
          </Button>
          <Button
            size="small"
            startIcon={isRefreshingIndex ? <CircularProgress size={14} /> : <RefreshIcon />}
            disabled={isRefreshingIndex}
            onClick={onReindex}
            sx={{
              color: theme => (theme.palette.mode === 'dark' ? '#f0d9aa' : 'inherit'),
              borderColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(240,217,170,0.25)' : undefined,
            }}
          >
            Reindex Docs & Notes
          </Button>
          {isUploading && (
            <Typography variant="caption" color="text.secondary">
              Indexing upload...
            </Typography>
          )}
        </Stack>

        {documents.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
            {documents.slice(0, 5).map(document => (
              <Chip
                key={document.document_id}
                size="small"
                label={`${document.source_type} · ${document.display_name} · ${document.index_status}`}
                variant="outlined"
                sx={{
                  bgcolor: theme =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(104, 72, 18, 0.12)',
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Divider />

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.950' : 'background.default'),
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {uploadError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {uploadError}
          </Alert>
        )}

        <AssistantMessageList messages={messages} />

        {isLoading && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            Assistant is working...
          </Typography>
        )}
      </Box>

      <Divider />

      <Box
        sx={{
          p: 1.25,
          bgcolor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.paper',
        }}
      >
        <AssistantComposer
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={isLoading || isUploading}
        />
      </Box>
    </Paper>
  );
}
