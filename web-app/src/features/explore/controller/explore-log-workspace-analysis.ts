/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis, validLogAnalysis } from '@/platform/perses';
import type { useExplorePageController } from './use-explore-page-controller';

export function readAnalysis(raw: string | undefined) {
  const valid = validLogAnalysis(raw);
  return { valid, value: valid && raw !== undefined ? parseLogAnalysis(raw) : DEFAULT_LOG_ANALYSIS };
}

export function workspaceAnalysis(controller: ReturnType<typeof useExplorePageController>) {
  const {
    query,
    submission: { draft }
  } = controller;
  const raw = query.signal === 'logs' ? query.logAnalysis : undefined;
  const draftRaw = draft.signal === 'logs' ? draft.logAnalysis : undefined;
  const { valid, value: applied } = readAnalysis(raw);
  const current = readAnalysis(draftRaw).value;
  return { valid, applied, current };
}
