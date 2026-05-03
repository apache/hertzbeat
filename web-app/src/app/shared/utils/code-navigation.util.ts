/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CodeNavigationHint } from '../../pojo/EntityDetail';

export function buildCodeNavigationUrl(hint?: CodeNavigationHint | null): string | undefined {
  const repositoryUrl = trimText(hint?.repositoryUrl);
  if (repositoryUrl == null) {
    return undefined;
  }
  const normalizedRepositoryUrl = repositoryUrl.replace(/\/+$/, '');
  const provider = normalizeProvider(trimText(hint?.provider), normalizedRepositoryUrl);
  const defaultPath = normalizeCodePath(trimText(hint?.defaultPath));
  const searchQuery = trimText(hint?.searchQuery);
  if (provider === 'github') {
    const query = [defaultPath != null ? `path:${defaultPath}` : undefined, searchQuery].filter(Boolean).join(' ');
    return query === '' ? normalizedRepositoryUrl : `${normalizedRepositoryUrl}/search?q=${encodeURIComponent(query)}&type=code`;
  }
  if (provider === 'gitlab') {
    const query = [searchQuery, defaultPath].filter(Boolean).join(' ');
    return query === '' ? normalizedRepositoryUrl : `${normalizedRepositoryUrl}/-/search?scope=blobs&search=${encodeURIComponent(query)}`;
  }
  if (provider === 'gitee') {
    const query = [defaultPath, searchQuery].filter(Boolean).join(' ');
    return query === '' ? normalizedRepositoryUrl : `${normalizedRepositoryUrl}/search?scope=repository&q=${encodeURIComponent(query)}`;
  }
  return normalizedRepositoryUrl;
}

function normalizeProvider(provider?: string, repositoryUrl?: string): string | undefined {
  const normalizedProvider = provider?.trim().toLowerCase();
  if (normalizedProvider) {
    return normalizedProvider;
  }
  if (repositoryUrl?.includes('github.com')) {
    return 'github';
  }
  if (repositoryUrl?.includes('gitlab.com')) {
    return 'gitlab';
  }
  if (repositoryUrl?.includes('gitee.com')) {
    return 'gitee';
  }
  return undefined;
}

function normalizeCodePath(path?: string): string | undefined {
  if (path == null) {
    return undefined;
  }
  return path.replace(/^\/+/, '').replace(/\/+$/, '') || undefined;
}

function trimText(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
