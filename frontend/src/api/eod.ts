import { api } from './index';

export interface FinalizeEodResponse {
  status: string;
  detail: string;
}

export async function finalizeEod(eodDate: string, force = false): Promise<FinalizeEodResponse> {
  const response = await api.get<FinalizeEodResponse>('/eod/finalize', {
    params: {
      eod_date: eodDate,
      force,
    },
  });
  return response.data;
}
