import React, { useEffect, useMemo, useState } from 'react';
import { Box, Fab } from '@mui/material';
import { SmartToy as AssistantIcon } from '@mui/icons-material';

import {
  listAssistantDocuments,
  queryAssistant,
  reindexAssistantDocuments,
  uploadAssistantDocument,
} from '../../api/assistant';
import type { AssistantChatMessage, AssistantDocument } from '../../interfaces/assistant';
import AssistantPanel from './AssistantPanel';

const STORAGE_KEY = 'prepiq-assistant-chat-v1';

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssistantFloater(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingIndex, setIsRefreshingIndex] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<AssistantDocument[]>([]);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [
        {
          id: makeMessageId('assistant'),
          role: 'assistant',
          content:
            'Ask about restaurant operations, alerts, forecast context, or procedures from indexed docs, notes, and uploaded files.',
        },
      ];
    }

    try {
      return JSON.parse(raw) as AssistantChatMessage[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    listAssistantDocuments()
      .then(nextDocuments => {
        if (mounted) {
          setDocuments(nextDocuments);
        }
      })
      .catch(requestError => {
        if (mounted) {
          setUploadError(
            requestError?.response?.data?.detail ||
              requestError?.message ||
              'Could not load assistant documents'
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const conversationId = useMemo(() => 'web-session', []);

  const handleSubmit = async (): Promise<void> => {
    const query = input.trim();
    if (!query) return;

    const userMessage: AssistantChatMessage = {
      id: makeMessageId('user'),
      role: 'user',
      content: query,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await queryAssistant({
        query,
        conversation_id: conversationId,
      });

      const assistantMessage: AssistantChatMessage = {
        id: makeMessageId('assistant'),
        role: 'assistant',
        content: response.answer,
        retrievalMode: response.retrieval_mode,
        warnings: response.warnings,
        citations: response.citations,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail || requestError?.message || 'Assistant request failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadAssistantDocument(file);
      const nextDocument = response.document;
      setDocuments(prev => [
        nextDocument,
        ...prev.filter(item => item.document_id !== nextDocument.document_id),
      ]);
      setMessages(prev => [
        ...prev,
        {
          id: makeMessageId('assistant'),
          role: 'assistant',
          content: `${response.message} ${nextDocument.display_name} is now available for retrieval.`,
          retrievalMode: 'document',
        },
      ]);
    } catch (requestError: any) {
      setUploadError(
        requestError?.response?.data?.detail || requestError?.message || 'Assistant upload failed'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async (): Promise<void> => {
    setIsRefreshingIndex(true);
    setUploadError(null);

    try {
      const response = await reindexAssistantDocuments();
      setMessages(prev => [
        ...prev,
        {
          id: makeMessageId('assistant'),
          role: 'assistant',
          content: `Reindexed ${response.indexed_count} built-in assistant documents from docs and notes.`,
          retrievalMode: 'document',
        },
      ]);
      const nextDocuments = await listAssistantDocuments();
      setDocuments(nextDocuments);
    } catch (requestError: any) {
      setUploadError(
        requestError?.response?.data?.detail || requestError?.message || 'Assistant reindex failed'
      );
    } finally {
      setIsRefreshingIndex(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: theme => theme.zIndex.modal + 2 }}>
      {open && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <AssistantPanel
            input={input}
            isLoading={isLoading}
            isUploading={isUploading}
            isRefreshingIndex={isRefreshingIndex}
            error={error}
            uploadError={uploadError}
            messages={messages}
            documents={documents}
            onClose={() => setOpen(false)}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onUpload={handleUpload}
            onReindex={handleReindex}
          />
        </Box>
      )}

      <Fab
        color="primary"
        variant="extended"
        onClick={() => setOpen(prev => !prev)}
        sx={{
          boxShadow: '0 16px 30px rgba(81, 59, 11, 0.28)',
          '@keyframes floaterWave': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-4px)' },
          },
          animation: open ? 'none' : 'floaterWave 2.2s ease-in-out infinite',
        }}
      >
        <AssistantIcon sx={{ mr: 1 }} />
        {open ? 'Hide Assistant' : 'Ask PrepIQ'}
      </Fab>
    </Box>
  );
}
