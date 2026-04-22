import { post } from './index';
import type { AssistantQueryRequest, AssistantQueryResponse } from '../interfaces/assistant';

export const queryAssistant = async (
  payload: AssistantQueryRequest
): Promise<AssistantQueryResponse> => post('/assistant/query', payload);
