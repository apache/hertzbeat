/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogExploreQuery } from './explore-query';
import { parseLogFilterExpression, serializeLogFilterExpression } from './explore-log-filter-expression';
import { isStructuredLogSyntax } from './explore-log-structured-syntax';

export type LogInspectorFilterTarget = {
  scope: 'resource' | 'attribute' | 'builtin';
  key: string;
  value: string;
  children?: string[];
  collection?: boolean;
  valueKind?: 'string' | 'number' | 'boolean' | 'unsupported';
  contextField?: 'serviceName' | 'serviceNamespace' | 'environment';
};
export type LogInspectorFilterDraft = Pick<
  LogExploreQuery,
  'resourceFilter' | 'attributeFilter' | 'query' | 'searchSyntax' | 'serviceName' | 'serviceNamespace' | 'environment'
>;
export type LogInspectorFilterScope = Pick<
  LogExploreQuery,
  'entityId' | 'serviceName' | 'serviceNamespace' | 'environment' | 'traceId' | 'spanId' | 'severityCategory'
>;
export type LogInspectorFilterControls = {
  logFilterScope?: LogInspectorFilterScope | undefined;
  onApplyLogFilters?: (() => void) | undefined;
  logFilterPending?: boolean | undefined;
  logFilterDraft?: LogInspectorFilterDraft | undefined;
  onAddLogFilter?: ((target: LogInspectorFilterTarget, operator: '=' | '!=', mode?: 'replace') => boolean) | undefined;
};

export function logInspectorFilterPatch(
  draft: LogInspectorFilterDraft,
  target: LogInspectorFilterTarget,
  operator: '=' | '!=',
  scope?: LogInspectorFilterScope,
  mode?: 'replace'
): LogInspectorFilterDraft | undefined {
  if (scopeLocksTarget(target, scope)) return undefined;
  if (mode === 'replace') return replaceFilterPatch(target, operator, draft.searchSyntax);
  if (target.scope === 'resource' && target.contextField) return canonicalFilterPatch(target, operator);
  if (target.scope === 'builtin') return builtinFilterPatch(draft, target, operator);
  if ((target.collection || target.children?.length) && !isStructuredLogSyntax(draft.searchSyntax)) return undefined;
  if (draft.searchSyntax) {
    return isStructuredLogSyntax(draft.searchSyntax) ? structuredFilterPatch(draft, target, operator) : undefined;
  }
  return legacyFilterPatch(draft, target, operator);
}

function replaceFilterPatch(target: LogInspectorFilterTarget, operator: '=' | '!=', syntax?: string) {
  const searchSyntax = syntax === 'structured-v2' ? syntax : 'structured-v1';
  const selected =
    target.scope === 'resource' && target.contextField
      ? canonicalFilterPatch(target, operator)
      : structuredFilterPatch({ searchSyntax }, target, operator);
  return selected ? { searchSyntax, query: '', resourceFilter: '', attributeFilter: '', ...selected } : undefined;
}

function builtinFilterPatch(draft: LogInspectorFilterDraft, target: LogInspectorFilterTarget, operator: '=' | '!=') {
  if (
    (draft.searchSyntax && !isStructuredLogSyntax(draft.searchSyntax)) ||
    (!draft.searchSyntax && draft.query?.trim())
  )
    return undefined;
  const patch = structuredFilterPatch(draft, target, operator);
  return patch && !draft.searchSyntax ? { ...patch, searchSyntax: 'structured-v1' } : patch;
}

function legacyFilterPatch(
  draft: LogInspectorFilterDraft,
  target: LogInspectorFilterTarget,
  operator: '=' | '!='
): LogInspectorFilterDraft | undefined {
  if (!isRepresentableScalar(target.value)) return undefined;
  const property = target.scope === 'resource' ? 'resourceFilter' : 'attributeFilter';
  const raw = draft[property] ?? '';
  const parsed = parseLogFilterExpression(raw);
  if (!parsed.valid || parsed.clauses.some(clause => clause.field === target.key)) return undefined;
  const clause = serializeLogFilterExpression([{ field: target.key, operator, value: `"${target.value}"` }]);
  if (!clause) return undefined;
  const expression = raw.trim() ? `${raw} AND ${clause}` : clause;
  return parseLogFilterExpression(expression).valid ? { [property]: expression } : undefined;
}

export function logInspectorFilterDisabledReason(
  draft: LogInspectorFilterDraft,
  target: LogInspectorFilterTarget,
  operator: '=' | '!=',
  scope?: LogInspectorFilterScope,
  mode?: 'replace'
): 'scope-locked' | 'legacy-value' | 'invalid' | 'unsupported-collection' | undefined {
  if (scopeLocksTarget(target, scope)) return 'scope-locked';
  const collectionReason = disabledCollectionReason(draft, target, mode);
  if (collectionReason) return collectionReason;
  const builtinReason = builtinLegacyReason(draft, target, operator, mode);
  if (builtinReason) return builtinReason;
  if (
    !draft.searchSyntax &&
    !target.contextField &&
    !isRepresentableScalar(target.value) &&
    structuredFilterPatch({}, target, operator)
  )
    return 'legacy-value';
  return logInspectorFilterPatch(draft, target, operator, scope, mode) ? undefined : 'invalid';
}

function builtinLegacyReason(
  draft: LogInspectorFilterDraft,
  target: LogInspectorFilterTarget,
  operator: '=' | '!=',
  mode?: 'replace'
): 'legacy-value' | 'invalid' | undefined {
  if (target.scope !== 'builtin' || mode === 'replace' || draft.searchSyntax || !draft.query?.trim()) return undefined;
  return structuredFilterPatch({}, target, operator) ? 'legacy-value' : 'invalid';
}

function disabledCollectionReason(
  draft: LogInspectorFilterDraft,
  target: LogInspectorFilterTarget,
  mode?: 'replace'
): 'unsupported-collection' | 'legacy-value' | undefined {
  if (!target.collection) return undefined;
  if (!['string', 'number'].includes(target.valueKind ?? '')) return 'unsupported-collection';
  if (target.valueKind === 'number' && !collectionNumber(target.value)) return 'unsupported-collection';
  return mode !== 'replace' && !isStructuredLogSyntax(draft.searchSyntax) ? 'legacy-value' : undefined;
}

function scopeLocksTarget(target: LogInspectorFilterTarget, scope?: LogInspectorFilterScope) {
  if (target.scope === 'builtin') return builtinScopeLocksTarget(target.key, scope);
  // Both filter scopes reject these aliases; authorization owns the workspace.
  if (['hertzbeat_workspace_id', 'workspace_id'].includes(target.key.replaceAll('.', '_'))) return true;
  if (target.scope !== 'resource') return false;
  if (canonicalScopeLocksTarget(target, scope)) return true;
  const lockedValues = new Map([
    ['service.name', scope?.serviceName],
    ['service.namespace', scope?.serviceNamespace],
    ['deployment.environment.name', scope?.environment],
    ['hertzbeat.entity_id', scope?.entityId]
  ]);
  return Boolean(lockedValues.get(target.key)?.trim());
}

function builtinScopeLocksTarget(key: string, scope?: LogInspectorFilterScope) {
  if (key === 'trace_id') return Boolean(scope?.traceId?.trim());
  if (key === 'span_id') return Boolean(scope?.spanId?.trim());
  if (key === 'status') return Boolean(scope?.severityCategory?.trim());
  return false;
}

function isEncodedOperator(value: string) {
  // Backend operator encodings cannot be represented as equality literals without changing meaning.
  return (
    /^(?:!|__hz_(?:in|not_in|contains|not_contains)__:)/u.test(value) ||
    ['__hz_exists__', '__hz_not_exists__'].includes(value)
  );
}

function isRepresentableScalar(value: string) {
  // The backend strips enclosing quotes but does not decode escapes or preserve edge whitespace.
  return Boolean(value) && value.trim() === value && !/["'\\\p{Cc}]/u.test(value) && !isEncodedOperator(value);
}

function structuredFilterPatch(
  draft: LogInspectorFilterDraft,
  target: LogInspectorFilterTarget,
  operator: '=' | '!='
): LogInspectorFilterDraft | undefined {
  if (!/^[A-Za-z0-9_.:-]{1,256}$/u.test(target.key) || /[\p{Cc}]/u.test(target.value)) return undefined;
  if (!validBuiltinTarget(target)) return undefined;
  if (!validCollectionPath(target)) return undefined;
  const field = `${target.scope === 'builtin' ? '' : target.scope === 'attribute' ? '@' : 'resource.'}${target.key.replaceAll(':', '\\:')}`;
  const clause = filterClause(field, target, operator);
  if (!clause) return undefined;
  const query = draft.query?.trim() ? `(${draft.query}) AND ${clause}` : clause;
  return query.length <= 8192 ? { query } : undefined;
}

function validBuiltinTarget(target: LogInspectorFilterTarget) {
  if (target.scope !== 'builtin') return true;
  if (target.collection || target.children?.length || target.contextField) return false;
  if (target.key === 'status') return ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(target.value);
  if (target.key === 'trace_id') return /^[0-9a-f]{32}$/u.test(target.value) && !/^0+$/u.test(target.value);
  if (target.key === 'span_id') return /^[0-9a-f]{16}$/u.test(target.value) && !/^0+$/u.test(target.value);
  return false;
}

function validCollectionPath(target: LogInspectorFilterTarget) {
  const children = target.children ?? [];
  return (
    children.length <= 3 &&
    target.key.length + children.reduce((length, child) => length + child.length, 0) <= 1024 &&
    children.every(
      child =>
        /^[A-Za-z0-9_.:-]{1,256}$/u.test(child) &&
        !['hertzbeat_workspace_id', 'workspace_id'].includes(child.replaceAll('.', '_'))
    )
  );
}

function collectionNumber(value: string) {
  return /^-?(?:0|[1-9]\d*)$/u.test(value) && Number.isSafeInteger(Number(value));
}

function filterClause(field: string, target: LogInspectorFilterTarget, operator: '=' | '!=') {
  const collection = Boolean(target.collection || target.children?.length);
  const number = target.valueKind === 'number' && collectionNumber(target.value);
  if (collection && target.valueKind !== 'string' && !number) return undefined;
  const path = collection ? `[]${(target.children ?? []).map(child => `[${JSON.stringify(child)}][]`).join('')}` : '';
  const prefix = operator === '!=' ? (collection ? 'NOT ' : '-') : '';
  return `${prefix}${field}${path}:${number ? target.value : JSON.stringify(target.value)}`;
}

function canonicalScopeLocksTarget(target: LogInspectorFilterTarget, scope?: LogInspectorFilterScope) {
  if (!scope) return false;
  if (target.contextField && (scope.entityId?.trim() || scope[target.contextField]?.trim())) return true;
  return (
    Boolean(scope.entityId?.trim()) &&
    ['service.name', 'service.namespace', 'deployment.environment.name'].includes(target.key)
  );
}

function canonicalFilterPatch(
  target: LogInspectorFilterTarget,
  operator: '=' | '!='
): LogInspectorFilterDraft | undefined {
  return target.contextField && operator === '=' && target.value && target.value.trim() === target.value
    ? { [target.contextField]: target.value }
    : undefined;
}
