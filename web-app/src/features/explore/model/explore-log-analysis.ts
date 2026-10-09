/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logAnalysisDraftSchema, type LogAnalysisState, type LogAnalysisResult } from '@/platform/perses';
export function readLogAnalysisDraft(raw: string | undefined): LogAnalysisState | undefined {
  if (!raw || raw.length > 65535) return undefined;
  try {
    const parsed = logAnalysisDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function hasUnsupportedLegacyLogAnalysis(raw: string | undefined) {
  const state = readLogAnalysisDraft(raw);
  return Boolean(
    state &&
    (state.representation === 'table' || state.representation === 'toplist') &&
    state.additionalMeasures?.length
  );
}

export type LogAnalysisLoad = {
  state: 'idle' | 'loading' | 'ready' | 'error' | 'permission' | 'unavailable' | 'interval_too_small';
  data: LogAnalysisResult | undefined;
  retry: () => void;
};
