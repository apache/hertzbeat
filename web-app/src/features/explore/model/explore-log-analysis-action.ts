/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogAnalysisGroup } from '@/platform/perses';
import type { LogFacetField } from './explore-log-facets';
import type { ExploreDraftFieldUpdate, LogExploreSubmissionDraft } from './explore-submission-model';
import { readLogGroupSelection, validLogGroupSelection } from '@/shared/log-group-selection';
export function logAnalysisGroupAction(
  draft: LogExploreSubmissionDraft,
  field: LogFacetField | null,
  group: LogAnalysisGroup
): { available: boolean; update?: ExploreDraftFieldUpdate } {
  if (!validLogGroupSelection(draft.logGroupSelection)) return { available: false };
  if (group.kind === 'all') return { available: field === null };
  const additions = readLogGroupSelection(
    JSON.stringify({
      version: 1,
      groups: group.keys ?? (field ? [{ field: field.id, kind: group.kind, value: group.value }] : [])
    })
  );
  if (!additions) return { available: false };
  const current = readLogGroupSelection(draft.logGroupSelection)?.groups ?? [];
  if (
    additions.groups.some(next =>
      current.some(
        existing =>
          existing.field === next.field && (existing.kind !== next.kind || (existing.value ?? null) !== next.value)
      )
    )
  )
    return { available: false };
  const groups = [
    ...current,
    ...additions.groups.filter(next => !current.some(existing => existing.field === next.field))
  ];
  if (groups.length === current.length) return { available: true };
  const value = JSON.stringify({ version: 1, groups });
  return validLogGroupSelection(value)
    ? { available: true, update: { field: 'logGroupSelection', value } }
    : { available: false };
}
