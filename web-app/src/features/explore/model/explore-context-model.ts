/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  mergeQueryContext,
  queryContextScopeKey,
  QUERY_CONTEXT_FIELDS,
  type QueryContext
} from '@/shared/query-context';

import type { ExploreQuery, ExploreQueryPatch } from './explore-query';

const exploreContextFields = Object.values(QUERY_CONTEXT_FIELDS);

export function exploreQueryContext(query: ExploreQuery): QueryContext {
  return {
    intakeProfileId: query.intakeProfileId,
    collectorId: query.collectorId,
    serviceName: query.serviceName,
    serviceNamespace: query.serviceNamespace,
    environment: query.environment,
    instance: query.instance,
    endpoint: query.endpoint
  };
}

export function mergeExploreContextChanges(context: QueryContext, changes: ExploreQueryPatch): ExploreQueryPatch {
  if (!exploreContextFields.some(field => Object.hasOwn(changes, field))) return changes;
  const patch = Object.fromEntries(
    exploreContextFields.flatMap(field => (Object.hasOwn(changes, field) ? [[field, changes[field]]] : []))
  ) as Partial<QueryContext>;
  const next = mergeQueryContext(context, patch);
  if (queryContextScopeKey(next) === queryContextScopeKey(context)) return changes;
  return {
    traceId: undefined,
    spanId: undefined,
    pageIndex: undefined,
    ...changes,
    intakeProfileId: next.intakeProfileId,
    collectorId: next.collectorId,
    serviceName: next.serviceName,
    serviceNamespace: next.serviceNamespace,
    environment: next.environment,
    instance: next.instance,
    endpoint: next.endpoint
  };
}
