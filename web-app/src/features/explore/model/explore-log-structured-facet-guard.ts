/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetField } from './explore-log-facets';
import type { LogExploreQuery } from './explore-query';
import type { LogExploreSubmissionDraft } from './explore-submission-types';
import { logInspectorFilterDisabledReason } from './explore-log-inspector-filter';

export function structuredFacetGuard(
  draft: LogExploreSubmissionDraft,
  scope: LogExploreQuery,
  field: LogFacetField,
  value: string,
  operator: '=' | '!='
): { selected: false; reason?: 'legacy-value' } | undefined {
  if (!value || value.trim() !== value || /[\p{Cc}]/u.test(value)) return { selected: false };
  if (field.source === 'builtin') return builtinFacetGuard(scope, field.key, value);
  const reason = logInspectorFilterDisabledReason(
    draft,
    { scope: field.source, key: field.key, value },
    operator,
    scope
  );
  return reason ? { selected: false, ...(reason === 'legacy-value' ? { reason } : {}) } : undefined;
}

function builtinFacetGuard(scope: LogExploreQuery, key: string, value: string): { selected: false } | undefined {
  if (!['severityCategory', 'serviceName', 'environment'].includes(key)) return { selected: false };
  if (key === 'severityCategory')
    return ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(value) ? undefined : { selected: false };
  return scope.entityId?.trim() || scope[key as 'serviceName' | 'environment']?.trim()
    ? { selected: false }
    : undefined;
}
