/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
