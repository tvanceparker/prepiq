export interface AssistantCitation {
  source_type: string;
  label: string;
  path?: string | null;
  snippet?: string | null;
  timestamp?: string | null;
}

export interface AssistantQueryRequest {
  query: string;
  conversation_id?: string | null;
}

export interface AssistantQueryResponse {
  status: 'scaffolded' | 'disabled' | 'not_configured';
  retrieval_mode: 'structured' | 'document' | 'blended';
  answer: string;
  warnings: string[];
  citations: AssistantCitation[];
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrievalMode?: AssistantQueryResponse['retrieval_mode'];
  warnings?: string[];
  citations?: AssistantCitation[];
}
