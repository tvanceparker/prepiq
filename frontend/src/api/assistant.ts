import { api, get, post } from './index';
import type {
  AssistantDocument,
  AssistantDocumentUploadResponse,
  AssistantQueryRequest,
  AssistantQueryResponse,
} from '../interfaces/assistant';

export const queryAssistant = async (
  payload: AssistantQueryRequest
): Promise<AssistantQueryResponse> => post('/assistant/query', payload);

export const listAssistantDocuments = async (): Promise<AssistantDocument[]> =>
  get('/assistant/documents');

export const uploadAssistantDocument = async (
  file: File
): Promise<AssistantDocumentUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<AssistantDocumentUploadResponse>(
    '/assistant/documents/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const reindexAssistantDocuments = async (): Promise<{ indexed_count: number }> =>
  post('/assistant/reindex');
