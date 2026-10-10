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

import { safeRedirectTarget } from '@/core/auth/navigation';

import { getAppRoute, type LegacyRouteDefinition } from './route-registry';

export function legacyRedirectTarget(
  definition: LegacyRouteDefinition,
  search: string,
  hash: string,
  routeParams: Readonly<Record<string, string | undefined>> = {}
) {
  const targetPath = getAppRoute(definition.targetRouteId).path;
  const sanitized = safeRedirectTarget(`${targetPath}${search}${hash}`) ?? targetPath;
  const { pathname, search: safeSearch, hash: safeHash } = splitLocalTarget(sanitized);
  const compatibility = resolveCompatibilityTarget(definition, pathname, safeSearch);
  const resolvedPathname = resolveTargetPath(compatibility.pathname, definition, routeParams);
  const mergedSearch = mergeFixedSearch(compatibility.search, definition.fixedSearch);
  return `${resolvedPathname}${mergedSearch}${safeHash}`;
}

const noticeTabTargets = {
  receiver: 'notice-receivers',
  receivers: 'notice-receivers',
  rule: 'notice-rules',
  rules: 'notice-rules',
  template: 'notice-templates',
  templates: 'notice-templates'
} as const;

function resolveCompatibilityTarget(definition: LegacyRouteDefinition, pathname: string, search: string) {
  if (definition.id !== 'legacy-alert-notice') return { pathname, search };
  const params = new URLSearchParams(search);
  const tab = params.get('tab')?.trim().toLowerCase() ?? '';
  params.delete('tab');
  const routeId = noticeTabTargets[tab as keyof typeof noticeTabTargets] ?? 'notice-receivers';
  const value = params.toString();
  return { pathname: getAppRoute(routeId).path, search: value ? `?${value}` : '' };
}

function resolveTargetPath(
  targetPath: string,
  definition: LegacyRouteDefinition,
  routeParams: Readonly<Record<string, string | undefined>>
) {
  if (!definition.targetPathParam) return targetPath;
  const value = routeParams[definition.targetPathParam];
  if (value === undefined) throw new Error(`Missing legacy route parameter: ${definition.targetPathParam}`);
  return targetPath.replace(`:${definition.targetPathParam}`, encodePathSegment(value));
}

function encodePathSegment(value: string) {
  const encoded = encodeURIComponent(value);
  if (encoded === '.') return '%2E';
  if (encoded === '..') return '%2E%2E';
  return encoded;
}

function splitLocalTarget(target: string) {
  const hashIndex = target.indexOf('#');
  const beforeHash = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
  const hash = hashIndex >= 0 ? target.slice(hashIndex) : '';
  const searchIndex = beforeHash.indexOf('?');
  return {
    pathname: searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash,
    search: searchIndex >= 0 ? beforeHash.slice(searchIndex) : '',
    hash
  };
}

function mergeFixedSearch(search: string, fixedSearch: LegacyRouteDefinition['fixedSearch']) {
  const inherited = new URLSearchParams(search);
  const merged = new URLSearchParams();
  for (const [field, value] of fixedSearch) merged.append(field, value);
  for (const [field, value] of inherited) {
    if (!merged.has(field)) merged.append(field, value);
  }
  const value = merged.toString();
  return value ? `?${value}` : '';
}
