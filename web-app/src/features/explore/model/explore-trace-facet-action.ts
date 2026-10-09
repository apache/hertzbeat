/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TraceExploreQuery } from './explore-query';
import type { TraceFacetField } from './explore-trace-analytics';
import type { ExploreDraftFieldUpdate, TraceExploreSubmissionDraft } from './explore-submission-model';
import { parseLogFilterExpression, serializeLogFilterExpression } from './explore-log-filter-expression';
import { quoteTraceFacetValue, traceClauseValues } from './explore-trace-facet-values';
export type TraceFacetMode = 'include' | 'exclude';
type Draft = Pick<
  TraceExploreSubmissionDraft,
  'serviceName' | 'environment' | 'query' | 'resourceFilter' | 'attributeFilter'
>;
const bindings = {
  serviceName: { filter: 'resourceFilter', key: 'service.name', fixed: 'serviceName' },
  operationName: { filter: 'attributeFilter', key: 'span.name', fixed: 'query' },
  environment: { filter: 'resourceFilter', key: 'deployment.environment.name', fixed: 'environment' }
} as const;
export function readTraceFacetGroup(draft: Draft, scope: TraceExploreQuery, field: TraceFacetField) {
  const binding = bindings[field],
    parsed = parseLogFilterExpression(draft[binding.filter]);
  const clause = parsed.valid ? parsed.clauses.find(item => item.field === binding.key) : undefined;
  const mode: TraceFacetMode = clause?.operator === '!=' || clause?.operator === 'NOT IN' ? 'exclude' : 'include';
  const state = groupLocked(draft, scope, field) ? 'locked' : safeGroup(parsed, field) ? 'ready' : 'raw';
  return { state, values: clause ? (traceClauseValues(clause) ?? []) : [], mode } as const;
}
function groupLocked(draft: Draft, scope: TraceExploreQuery, field: TraceFacetField) {
  const fixed = bindings[field].fixed;
  return Boolean(
    scope.traceStructure ||
    scope[fixed]?.trim() ||
    draft[fixed].trim() ||
    (scope.entityId?.trim() && field !== 'operationName')
  );
}
function safeGroup(parsed: ReturnType<typeof parseLogFilterExpression>, field: TraceFacetField) {
  if (!parsed.valid) return false;
  if (parsed.clauses.some(clause => traceClauseValues(clause) === undefined)) return false;
  if (field === 'operationName' && parsed.clauses.some(clause => ['span_name', 'spanName'].includes(clause.field)))
    return false;
  return parsed.clauses.every(
    clause => clause.field !== bindings[field].key || ['=', '!=', 'IN', 'NOT IN'].includes(clause.operator)
  );
}
export function traceFacetAction(
  draft: Draft,
  scope: TraceExploreQuery,
  field: TraceFacetField,
  value: string,
  mode: TraceFacetMode = readTraceFacetGroup(draft, scope, field).mode
): ExploreDraftFieldUpdate | undefined {
  const group = readTraceFacetGroup(draft, scope, field);
  if (group.state !== 'ready' || !quoteTraceFacetValue(value)) return undefined;
  const values = group.values.includes(value) ? group.values.filter(item => item !== value) : [...group.values, value];
  return updateGroup(draft, field, values, mode);
}
export function traceFacetModeAction(
  draft: Draft,
  scope: TraceExploreQuery,
  field: TraceFacetField,
  mode: TraceFacetMode
): ExploreDraftFieldUpdate | undefined {
  const group = readTraceFacetGroup(draft, scope, field);
  return group.state === 'ready' && group.values.length ? updateGroup(draft, field, group.values, mode) : undefined;
}
export function traceFacetClearAction(
  draft: Draft,
  scope: TraceExploreQuery,
  field: TraceFacetField
): ExploreDraftFieldUpdate | undefined {
  const group = readTraceFacetGroup(draft, scope, field);
  return group.state === 'ready' && group.values.length ? updateGroup(draft, field, [], group.mode) : undefined;
}
function updateGroup(
  draft: Draft,
  field: TraceFacetField,
  values: string[],
  mode: TraceFacetMode
): ExploreDraftFieldUpdate | undefined {
  const binding = bindings[field],
    parsed = parseLogFilterExpression(draft[binding.filter]);
  if (!parsed.valid) return undefined;
  const clauses = parsed.clauses.filter(clause => clause.field !== binding.key);
  if (values.length)
    clauses.push({
      field: binding.key,
      operator: mode === 'include' ? 'IN' : 'NOT IN',
      value: `(${values.map(quoteTraceFacetValue).join(', ')})`
    });
  const value = serializeLogFilterExpression(clauses);
  if (clauses.length && value === undefined) return undefined;
  return { field: binding.filter, value: value ?? '' };
}
