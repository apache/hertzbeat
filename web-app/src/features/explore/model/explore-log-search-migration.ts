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

import { appendStructuredClause } from './explore-log-structured-facet-action';

/** Keep old literal links literal while new searches use one structured query. */
type LogSearchInput = { query?: string | undefined; searchSyntax?: string | undefined };

export function normalizeLogSearch(query: LogSearchInput) {
  if (query.searchSyntax) return { query: query.query, searchSyntax: query.searchSyntax };
  const literal = query.query;
  if (!literal) return { query: literal, searchSyntax: 'structured-v1' };
  const quoted = JSON.stringify(literal);
  // The backend quoted-token grammar cannot represent control characters.
  // Keep these legacy searches intact instead of silently changing their scope.
  if (/[\p{Cc}]/u.test(literal) || quoted.length > 8192) return { query: literal, searchSyntax: query.searchSyntax };
  return { query: quoted, searchSyntax: 'structured-v1' };
}

/** Surface only legacy filters whose query semantics are known to match exactly. */
export function migrateVisibleLegacyLogFilters(
  query: LogSearchInput & {
    severityCategory?: string | undefined;
    resourceFilter?: string | undefined;
    attributeFilter?: string | undefined;
  }
) {
  const normalized = normalizeLogSearch(query);
  let text = normalized.query ?? '';
  let severityCategory = query.severityCategory;
  const append = (name: string, value: string, operator: '=' | '!=') => {
    if (text.includes(`${name}:`)) return false;
    const clause = `${operator === '!=' ? '-' : ''}${name}:${JSON.stringify(value)}`;
    const next = appendStructuredClause(text, clause);
    if (next.length > 8192) return false;
    text = next;
    return true;
  };
  if (
    normalized.searchSyntax === 'structured-v1' &&
    ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes((severityCategory ?? '').toUpperCase())
  ) {
    if (append('status', severityCategory!.toUpperCase(), '=')) severityCategory = undefined;
  }
  return {
    query: text || normalized.query,
    searchSyntax: normalized.searchSyntax,
    severityCategory,
    resourceFilter: query.resourceFilter,
    attributeFilter: query.attributeFilter
  };
}
