/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogFacetFieldsResult, LogFacetValuesResult } from '../model/explore-log-facets';
import { useCallback, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { buildLogFacetPath, loadLogFacetFields, loadLogFacetValues } from '../api/explore-log-facets-api';
import { exploreHandoffState, exploreUsesExactWindow, type ExploreQuery } from '../model/explore-model';
import type { ExplorePageResultState } from '../model/explore-result-model';
import {
  searchFieldName,
  searchSuggestionCondition,
  type LogSearchSuggestions
} from '../model/explore-log-search-authoring';
import { exploreQueryKeys } from './explore-query-keys';
import { parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';

export function useLogSearchSuggestions(query: ExploreQuery, result: ExplorePageResultState): LogSearchSuggestions {
  const [requested, setRequested] = useState<{ field: string | undefined; prefix: string | undefined }>();
  const requestField = useCallback((field: string | undefined, prefix?: string) => setRequested({ field, prefix }), []);
  const window = suggestionWindow(query, result);
  const enabled = catalogEnabled(window, query, result);
  const path = facetPath(enabled, query, window, 'fields');
  const fields = useQuery({
    queryKey: exploreQueryKeys.logFacets(path),
    enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadLogFacetFields(path, window!, signal)
  });
  const selectedField = requestedFieldFor(fields.data, requested);
  const field = selectedField;
  const valuePath = facetPath(enabled && Boolean(field), query, window, 'values', field?.id);
  const values = useQuery({
    queryKey: exploreQueryKeys.logFacets(valuePath),
    enabled: !!valuePath,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => loadLogFacetValues(valuePath, window!, field!.id, signal)
  });
  const resultSuggestions = resultSuggestionsFor(query, enabled, requested, field, fields, values);
  return { ...resultSuggestions, field: requested?.field, requestField };
}

function catalogEnabled(
  window: ReturnType<typeof suggestionWindow>,
  query: ExploreQuery,
  result: ExplorePageResultState
) {
  return (
    Boolean(window) &&
    suggestionEnabled(query, result) &&
    !(query.signal === 'logs' && query.logCalculatedV2 !== undefined)
  );
}

function facetPath(
  enabled: boolean,
  query: ExploreQuery,
  window: ReturnType<typeof suggestionWindow>,
  mode: 'fields' | 'values',
  fieldId?: string
) {
  return enabled && query.signal === 'logs' && window ? buildLogFacetPath(query, window, mode, fieldId) : '';
}

function resultSuggestionsFor(
  query: ExploreQuery,
  enabled: boolean,
  requested: { field: string | undefined; prefix: string | undefined } | undefined,
  field: LogFacetFieldsResult['fields'][number] | undefined,
  fields: UseQueryResult<LogFacetFieldsResult>,
  values: UseQueryResult<LogFacetValuesResult>
) {
  if (query.signal === 'logs' && query.logCalculatedV2 !== undefined) {
    return { state: 'ready' as const, options: calculatedNameOptions(query.logCalculatedV2, requested?.field) };
  }
  return suggestionResult(enabled, requested, field ? searchFieldName(field) : undefined, fields, values);
}

function requestedFieldFor(
  result: LogFacetFieldsResult | undefined,
  requested: { field: string | undefined; prefix: string | undefined } | undefined
) {
  if (!requested || !result) return undefined;
  if (requested.field) return result.fields.find(item => searchFieldName(item) === requested.field);
  if (!requested.prefix) return undefined;
  return result.fields.find(item => searchFieldName(item)?.toLowerCase().startsWith(requested.prefix!.toLowerCase()));
}

function calculatedNameOptions(raw: string, requested: string | undefined) {
  if (requested) return [];
  const fields = parseLogCalculatedV2(raw)?.fields ?? [];
  return fields
    .flatMap(field => (field.kind === 'formula' ? [field.name] : field.captures.map(capture => capture.name)))
    .map(name => ({ value: `#${name}`, label: `#${name}`, fieldValue: false }));
}
function suggestionResult(
  enabled: boolean,
  requested: { field: string | undefined; prefix: string | undefined } | undefined,
  matchedField: string | undefined,
  fields: UseQueryResult<LogFacetFieldsResult>,
  values: UseQueryResult<LogFacetValuesResult>
): Omit<LogSearchSuggestions, 'requestField'> {
  if (!enabled) return { state: 'unavailable', options: [] };
  if (fields.isError || fields.data?.state === 'unavailable') return { state: 'unavailable', options: [] };
  if (fields.isPending) return { state: 'loading', options: [] };
  if (requested?.field) return valueResult(requested.field, Boolean(matchedField), values);
  return prefixSuggestions(requested?.prefix, matchedField, fields, values);
}
function prefixSuggestions(
  prefix: string | undefined,
  matchedField: string | undefined,
  fields: UseQueryResult<LogFacetFieldsResult>,
  values: UseQueryResult<LogFacetValuesResult>
): Omit<LogSearchSuggestions, 'requestField'> {
  const fieldOptions = (fields.data?.fields ?? []).flatMap(item => {
    const value = searchFieldName(item);
    return value && !value.includes(':') ? [{ value, label: value, fieldValue: false }] : [];
  });
  if (!prefix || !matchedField) return { state: 'ready', options: fieldOptions };
  if (values.isPending) return { state: 'loading', options: fieldOptions };
  if (values.isError || values.data?.state === 'unavailable') return { state: 'ready', options: fieldOptions };
  return { state: 'ready', options: [...fieldOptions, ...conditionValueResult(matchedField, values)] };
}
function valueResult(
  field: string,
  hasField: boolean,
  values: UseQueryResult<LogFacetValuesResult>
): Omit<LogSearchSuggestions, 'requestField'> {
  return {
    state: values.isError || values.data?.state === 'unavailable' ? 'unavailable' : 'ready',
    options: hasField
      ? (values.data?.values ?? []).map(item => ({
          label: item.value,
          value: item.value,
          condition: searchSuggestionCondition(field, item.value),
          count: item.count,
          fieldValue: true
        }))
      : []
  };
}
function conditionValueResult(field: string, values: UseQueryResult<LogFacetValuesResult>) {
  return (values.data?.values ?? []).map(item => {
    const condition = searchSuggestionCondition(field, item.value);
    return {
      label: condition,
      value: item.value,
      condition,
      insertion: condition,
      count: item.count,
      fieldValue: true
    };
  });
}
function suggestionWindow(query: ExploreQuery, result: ExplorePageResultState) {
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  if (exploreUsesExactWindow(query)) return { from: query.start!, to: query.end! };
  return 'window' in evidence ? evidence.window : undefined;
}
function suggestionEnabled(query: ExploreQuery, result: ExplorePageResultState) {
  return (
    query.signal === 'logs' &&
    !query.live &&
    !query.logRecordUid &&
    exploreHandoffState(query) !== 'invalid' &&
    result.kind !== 'invalid_filter' &&
    !(result.kind === 'stale_error' && result.errorKind === 'invalid_filter')
  );
}
