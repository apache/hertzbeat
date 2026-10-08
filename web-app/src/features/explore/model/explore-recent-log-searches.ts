/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import {
  buildSubmissionPatch,
  draftFromQuery,
  type ExploreSubmissionDraft,
  type LogExploreSubmissionDraft
} from './explore-submission-model';

export type RecentLogSearch = LogExploreSubmissionDraft & { executedAt: number };
export type RecentLogSearchesViewModel = {
  entries: RecentLogSearch[];
  record: (draft: ExploreSubmissionDraft) => void;
  remove: (index: number) => void;
  clear: () => void;
};
const recentSchema = z.object({
  signal: z.literal('logs'),
  query: z.string(),
  sort: z.enum(['newest', 'oldest']).optional(),
  logSort: z.string().optional(),
  logAnalysis: z.string().optional(),
  logAggregation: z.string().optional(),
  logTransactions: z.string().optional(),
  logCalculated: z.string().optional(),
  logCalculatedV2: z.string().optional(),
  logSubquery: z.string().optional(),
  logReferenceJoin: z.string().optional(),
  serviceName: z.string(),
  serviceNamespace: z.string(),
  environment: z.string(),
  instance: z.string(),
  endpoint: z.string(),
  searchSyntax: z.string().default(''),
  logGroupSelection: z.string().optional(),
  logNumericRange: z.string().optional(),
  severityText: z.string(),
  severityCategory: z.string(),
  traceId: z.string(),
  spanId: z.string(),
  resourceFilter: z.string(),
  attributeFilter: z.string(),
  hideInternal: z.boolean(),
  hideNoise: z.boolean(),
  executedAt: z.number().positive().max(8_640_000_000_000_000)
});
export function recentLogSearchKey(workspace: string, username: string) {
  return `hertzbeat.explore.recent-log-filters.v1.${JSON.stringify([workspace, username])}`;
}
export function readRecentLogSearches(raw: string | null): RecentLogSearch[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .flatMap(item => {
        const parsed = recentSchema.safeParse(item);
        return parsed.success && buildSubmissionPatch(parsed.data).valid ? [parsed.data] : [];
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}
export function addRecentLogSearch(history: RecentLogSearch[], draft: ExploreSubmissionDraft, executedAt = Date.now()) {
  if (draft.signal !== 'logs') return history;
  const result = buildSubmissionPatch(draft);
  if (!result.valid) return history;
  const normalized = draftFromQuery({
    ...result.patch,
    signal: 'logs',
    timeRange: 'last-30m'
  }) as LogExploreSubmissionDraft;

  return [
    { ...normalized, executedAt },
    ...history.filter(item =>
      Object.entries(normalized).some(([key, value]) => item[key as keyof LogExploreSubmissionDraft] !== value)
    )
  ].slice(0, 10);
}
