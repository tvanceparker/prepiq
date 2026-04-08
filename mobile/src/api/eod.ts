import * as api from './index';
import type { EodRunSummary } from '../interfaces/eod';

export async function fetchLatestEodSummary(): Promise<EodRunSummary> {
  return api.get('/eod/summary');
}
