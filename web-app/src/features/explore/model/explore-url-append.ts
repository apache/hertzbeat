/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. */
import { metricQueryFields } from './explore-parity-filter-model';
import type { ExploreQuery } from './explore-query';
import { setEnabled, setOpaqueRouteValue, setValue } from './explore-url-values';

export function appendSignalParams(params: URLSearchParams, query: ExploreQuery) {
  if (query.signal === 'metrics') {
    for (const [key, value] of Object.entries(metricQueryFields(query))) setValue(params, key, value);
    return;
  }
  setValue(params, 'traceId', query.traceId);
  setValue(params, 'resourceFilter', query.resourceFilter);
  setValue(params, 'attributeFilter', query.attributeFilter);
  setValue(params, 'spanId', query.spanId);
  if (query.pageIndex) params.set('page', String(query.pageIndex));
  if (query.signal === 'logs') {
    if (query.live) params.set('mode', 'live');
    setValue(params, 'searchSyntax', query.searchSyntax);
    setValue(params, 'severityText', query.severityText);
    setValue(params, 'severityCategory', query.severityCategory);
    setOpaqueRouteValue(params, 'logRecordUid', query.logRecordUid);
    setValue(params, 'logView', query.logView);
    setOpaqueRouteValue(params, 'logAnalysis', query.logAnalysis);
    setOpaqueRouteValue(params, 'logAggregation', query.logAggregation);
    setOpaqueRouteValue(params, 'logTransactions', query.logTransactions);
    setOpaqueRouteValue(params, 'logCalculated', query.logCalculated);
    setOpaqueRouteValue(params, 'logCalculatedV2', query.logCalculatedV2);
    setOpaqueRouteValue(params, 'logSubquery', query.logSubquery);
    setOpaqueRouteValue(params, 'logReferenceJoin', query.logReferenceJoin);
    setOpaqueRouteValue(params, 'logGroupSelection', query.logGroupSelection);
    setOpaqueRouteValue(params, 'logNumericRange', query.logNumericRange);
    setValue(params, 'traceReturnTo', query.traceReturnTo);
    setOpaqueRouteValue(params, 'logSort', query.logSort);
    if (query.sort !== 'newest') setValue(params, 'sort', query.sort);
    setEnabled(params, 'hideInternal', query.hideInternal);
    setEnabled(params, 'hideNoise', query.hideNoise);
    return;
  }
  setValue(params, 'traceView', query.traceView);
  setOpaqueRouteValue(params, 'traceStructure', query.traceStructure);
  setValue(params, 'traceStructureView', query.traceStructureView);
  if (query.endExclusive) params.set('endExclusive', 'true');
  if (query.sort === 'duration_desc') params.set('sort', query.sort);
  if (query.errorOnly) params.set('errorOnly', 'true');
  setValue(params, 'spanScope', query.spanScope);
  setEnabled(params, 'hideInternal', query.hideInternal);
  if (query.minDurationMs != null) params.set('minDurationMs', String(query.minDurationMs));
  if (query.maxDurationMs != null) params.set('maxDurationMs', String(query.maxDurationMs));
}
