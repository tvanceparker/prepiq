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

export interface AssistantDocument {
  document_id: number;
  source_type: 'docs' | 'notes' | 'upload' | string;
  display_name: string;
  source_path?: string | null;
  index_status: string;
  content_type?: string | null;
  updated_at?: string | null;
  indexed_at?: string | null;
}

export interface AssistantDocumentUploadResponse {
  document: AssistantDocument;
  message: string;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrievalMode?: AssistantQueryResponse['retrieval_mode'];
  warnings?: string[];
  citations?: AssistantCitation[];
}
