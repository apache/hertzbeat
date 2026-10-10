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

import type { ExploreQuery } from './explore-query';
import type { LogExploreQuery } from './explore-query';
import { validLogCalculatedV2Query } from './explore-log-calculated-v2';
import { readLogSort } from './explore-log-order';

export function validLogPanelQuery(query: LogExploreQuery, analytical: boolean) {
  return !(
    (query.logCalculatedV2 !== undefined && (analytical || !validLogCalculatedV2Query(query))) ||
    query.logRecordUid ||
    query.live ||
    (query.logSort !== undefined && !readLogSort(query.logSort))
  );
}

export function blockedHandoffMode(query: ExploreQuery) {
  if (query.signal === 'traces' && query.traceStructure !== undefined)
    return { state: 'unsupported' as const, reason: 'trace-structure' as const };
  if (query.signal !== 'logs') return undefined;
  if (query.logSubquery !== undefined) return { state: 'unsupported' as const, reason: 'log-subquery' as const };
  if (query.logAggregation === 'transactions')
    return { state: 'unsupported' as const, reason: 'log-transactions' as const };
  if (query.logAggregation === 'patterns') return { state: 'unsupported' as const, reason: 'log-patterns' as const };
  if (query.logAggregation === 'calculated')
    return { state: 'unsupported' as const, reason: 'log-calculated' as const };
  return undefined;
}
