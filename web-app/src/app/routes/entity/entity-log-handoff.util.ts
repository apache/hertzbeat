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
 * KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type EntityLogHandoffMode = 'trace' | 'severity' | 'search' | 'default';

export interface EntityLogHandoffLike {
  search?: string | null;
  traceId?: string | null;
  spanId?: string | null;
  severityText?: string | null;
  severityNumber?: number | string | null;
}

export interface EntityLogHandoffTokensOptions {
  searchLabel: string;
  severityLabel: string;
}

function trimText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function resolveEntityLogHandoffMode(handoff: EntityLogHandoffLike): EntityLogHandoffMode {
  if (trimText(handoff.traceId) != null || trimText(handoff.spanId) != null) {
    return 'trace';
  }
  if (trimText(handoff.severityText) != null || handoff.severityNumber != null) {
    return 'severity';
  }
  if (trimText(handoff.search) != null) {
    return 'search';
  }
  return 'default';
}

export function buildEntityLogHandoffTokens(
  handoff: EntityLogHandoffLike,
  options: EntityLogHandoffTokensOptions
): string[] {
  const tokens: string[] = [];
  const search = trimText(handoff.search);
  const traceId = trimText(handoff.traceId);
  const spanId = trimText(handoff.spanId);
  const severityText = trimText(handoff.severityText);

  if (search != null) {
    tokens.push(`${options.searchLabel}: ${search}`);
  }
  if (traceId != null) {
    tokens.push(`traceId: ${traceId}`);
  }
  if (spanId != null) {
    tokens.push(`spanId: ${spanId}`);
  }
  if (severityText != null) {
    tokens.push(`${options.severityLabel}: ${severityText}`);
  } else if (handoff.severityNumber != null) {
    tokens.push(`${options.severityLabel}: ${handoff.severityNumber}`);
  }
  return tokens;
}

export function summarizeEntityLogResourceFilters(filters?: Record<string, string> | null, limit = 3): string | undefined {
  if (filters == null) {
    return undefined;
  }
  const entries = Object.entries(filters)
    .map(([key, value]) => [trimText(key), trimText(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[0] != null && entry[1] != null)
    .slice(0, limit);
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(([key, value]) => `${key}=${value}`).join(' · ');
}

export function pickEntityLogPreferredSearchTerm(
  preferredSearchTerms?: string[] | null,
  fallbackSearchTerm?: string | null
): string | undefined {
  const firstSearchTerm = (preferredSearchTerms || []).map(term => trimText(term)).find((term): term is string => term != null);
  return firstSearchTerm || trimText(fallbackSearchTerm);
}
