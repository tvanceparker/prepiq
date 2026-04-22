import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  FAB,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { queryAssistant } from '../../api/assistant';
import type { AssistantChatMessage } from '../../interfaces/assistant';

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssistantOverlay(): React.ReactElement {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: makeMessageId('assistant'),
      role: 'assistant',
      content:
        'Ask operational questions like: what should I reorder today, why did this PO suggestion fire, what forecast data is stale, or how do I set up recipes.',
    },
  ]);

  const conversationId = useMemo(() => 'mobile-session', []);

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

      setMessages(prev => [
        ...prev,
        {
          id: makeMessageId('assistant'),
          role: 'assistant',
          content: response.answer,
          retrievalMode: response.retrieval_mode,
          warnings: response.warnings,
          citations: response.citations,
        },
      ]);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.detail || requestError?.message || 'Assistant request failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <Surface style={styles.header} elevation={1}>
              <View style={styles.headerText}>
                <Text variant="titleMedium">PrepIQ Assistant</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Indexed docs, uploaded files, and read-only live restaurant context
                </Text>
              </View>
              <Button onPress={() => setVisible(false)}>Close</Button>
            </Surface>

            <ScrollView contentContainerStyle={styles.messages}>
              {error && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 12 }}>
                  {error}
                </Text>
              )}

              {messages.map(message => (
                <View
                  key={message.id}
                  style={[
                    styles.bubble,
                    message.role === 'user'
                      ? { alignSelf: 'flex-end', backgroundColor: theme.colors.primary }
                      : { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Text
                    variant="bodyMedium"
                    style={{
                      color:
                        message.role === 'user' ? theme.colors.onPrimary : theme.colors.onSurface,
                    }}
                  >
                    {message.content}
                  </Text>

                  {message.role === 'assistant' && message.warnings?.length ? (
                    <View style={styles.metaBlock}>
                      {message.warnings.map(warning => (
                        <Text
                          key={warning}
                          variant="labelSmall"
                          style={{ color: theme.colors.error }}
                        >
                          {warning}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {message.role === 'assistant' && message.citations?.length ? (
                    <View style={styles.metaBlock}>
                      <Text variant="labelSmall">Sources</Text>
                      {message.citations.slice(0, 3).map((citation, index) => (
                        <Text key={`${citation.label}-${index}`} variant="labelSmall">
                          {citation.label}
                          {citation.path ? ` • ${citation.path}` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}

              {isLoading && <ActivityIndicator style={{ marginTop: 8 }} />}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                mode="outlined"
                label="Ask PrepIQ"
                value={input}
                onChangeText={setInput}
                multiline
                disabled={isLoading}
                style={styles.input}
              />
              <Button mode="contained" onPress={handleSubmit} disabled={isLoading || !input.trim()}>
                Send
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      <FAB
        icon="robot-outline"
        label={visible ? 'Hide Assistant' : 'Ask PrepIQ'}
        onPress={() => setVisible(prev => !prev)}
        style={styles.fab}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  keyboardView: {
    minHeight: 420,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  messages: {
    padding: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaBlock: {
    marginTop: 8,
  },
  composer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 12,
  },
  input: {
    backgroundColor: 'transparent',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
