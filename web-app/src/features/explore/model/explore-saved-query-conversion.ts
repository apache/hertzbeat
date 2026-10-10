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

import { legacySignalRoutes } from '@/shared/navigation/signal-route-paths';
import { applicationRoutePaths } from '@/shared/navigation/app-paths';

import { normalizeLogSearch } from './explore-log-search-migration';
import { parseSavedExploreQuery } from './explore-saved-query-schema';
import { buildExplorePath, parseExploreQuery } from './explore-url-model';
import type { ExploreQuery, ExploreSignal } from './explore-query';

const aliases: Record<string, string> = {
  namespace: 'serviceNamespace',
  serviceInstanceId: 'instance',
  'http.route': 'endpoint',
  range: 'timeRange'
};

export function convertSavedQueryRoute(signal: ExploreSignal, route: string): ExploreQuery | undefined {
  const url = localSavedRoute(signal, route);
  if (!url) return undefined;
  const mapped = mapSavedParams(signal, url.searchParams);
  if (!mapped) return undefined;
  const parsed = parseExploreQuery(mapped);
  const canonical = new URL(buildExplorePath(parsed), 'https://hertzbeat.local').searchParams;
  // General URL parsing may default or discard unsupported inputs; a saved record may not.
  for (const [key, value] of mapped) {
    const expected =
      signal === 'logs' && key === 'query'
        ? normalizeLogSearch({ query: value, searchSyntax: mapped.get('searchSyntax') ?? undefined }).query
        : value;
    if (canonical.get(key) !== expected && !omittedDefault(signal, key, value, canonical)) return undefined;
  }
  const query = { ...parsed } as ExploreQuery & { pageIndex?: number };
  delete query.pageIndex;
  delete query.returnTo;
  if (query.signal === 'logs') delete query.traceReturnTo;
  delete query.servicesReturnTo;
  delete query.dashboardReturnTo;
  delete query.savedView;
  return parseSavedExploreQuery(query);
}

function localSavedRoute(signal: ExploreSignal, route: string) {
  if (!route.startsWith('/') || route.startsWith('//') || /[\\\r\n]|%(?![0-9a-f]{2})/iu.test(route)) return undefined;
  let url: URL;
  try {
    url = new URL(route, 'https://hertzbeat.local');
  } catch {
    return undefined;
  }
  if (url.origin !== 'https://hertzbeat.local' || url.hash) return undefined;
  const oldSignal = legacySignalRoutes.find(item => item.path === url.pathname)?.signal;
  if (url.pathname !== applicationRoutePaths.explore && oldSignal !== signal) return undefined;
  if (url.searchParams.has('signal') && url.searchParams.get('signal') !== signal) return undefined;
  return url;
}

const sharedDefaults = { page: '0', autoRefresh: '0', source: 'external' };
const signalDefaults: Record<ExploreSignal, Record<string, string>> = {
  metrics: sharedDefaults,
  logs: { ...sharedDefaults, mode: 'history', live: 'false', hideInternal: 'false', hideNoise: 'false' },
  traces: { ...sharedDefaults, sort: 'newest', errorOnly: 'false', hideInternal: 'false' }
};
function omittedDefault(signal: ExploreSignal, key: string, value: string, canonical: URLSearchParams) {
  return !canonical.has(key) && signalDefaults[signal][key] === value;
}

function mapSavedParams(signal: ExploreSignal, original: URLSearchParams) {
  const mapped = new URLSearchParams({ signal });
  const seen = new Set<string>();
  for (const [field, value] of original) {
    const key = signalAlias(signal, field);
    if (seen.has(key)) return undefined;
    seen.add(key);
    if (key !== 'signal') mapped.set(key, value);
  }
  return mapped;
}

function signalAlias(signal: ExploreSignal, key: string) {
  if (signal === 'logs' && key === 'search') return 'query';
  if (signal === 'traces' && key === 'operationName') return 'query';
  if (signal === 'metrics' && key === 'filter') return 'metricFilter';
  return aliases[key] ?? key;
}
