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

import { resolveLogRowHeight, validLogColumns, type LogColumn } from '@/platform/perses';

export type ExploreLogDisplayPreferences = {
  density: 'compact' | 'comfortable';
  wrap: boolean;
  showTime: boolean;
  rowHeight?: 'small' | 'medium' | 'large';
  contentDisplay?: 'message' | 'attributes' | 'stack';
  showContent?: boolean;
  standardizeHeaders?: boolean;
  showTimeline?: boolean;
  columnOrder?: LogColumn[];
};

export const DEFAULT_LOG_DISPLAY_PREFERENCES: ExploreLogDisplayPreferences = {
  density: 'compact',
  wrap: false,
  showTime: true,
  rowHeight: 'small',
  contentDisplay: 'message',
  showContent: true,
  standardizeHeaders: true,
  showTimeline: true
};

export type ExploreLogPreferenceScope = { workspaceId: string; username: string };
type PreferenceKind = 'display' | 'facets';

export function exploreLogPreferenceKey(kind: PreferenceKind, scope: ExploreLogPreferenceScope) {
  return `hertzbeat.explore.logs.${kind}.v1.${JSON.stringify([scope.workspaceId, scope.username])}`;
}

export function readLogDisplayPreferences(scope?: ExploreLogPreferenceScope): ExploreLogDisplayPreferences {
  if (!scope) return DEFAULT_LOG_DISPLAY_PREFERENCES;
  try {
    const stored = window.localStorage.getItem(exploreLogPreferenceKey('display', scope));
    if (!stored || stored.length > 65_536) return DEFAULT_LOG_DISPLAY_PREFERENCES;
    return normalizePreferences(JSON.parse(stored)) ?? DEFAULT_LOG_DISPLAY_PREFERENCES;
  } catch {
    // Storage is an optional display enhancement; keep a stable default when it is unavailable.
  }
  return DEFAULT_LOG_DISPLAY_PREFERENCES;
}

function normalizePreferences(value: unknown): ExploreLogDisplayPreferences | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const parsed = value as Partial<ExploreLogDisplayPreferences>;
  if ((parsed.density !== 'compact' && parsed.density !== 'comfortable') || typeof parsed.wrap !== 'boolean')
    return undefined;
  return {
    density: parsed.density,
    wrap: parsed.wrap,
    showTime: parsed.showTime !== false,
    rowHeight: resolveLogRowHeight(parsed),
    contentDisplay: validContentDisplay(parsed.contentDisplay) ? parsed.contentDisplay : 'message',
    showContent: parsed.showContent !== false,
    standardizeHeaders: parsed.standardizeHeaders !== false,
    showTimeline: parsed.showTimeline !== false,
    ...(validLogColumns(parsed.columnOrder) ? { columnOrder: parsed.columnOrder } : {})
  };
}

function validContentDisplay(value: unknown): value is 'message' | 'attributes' | 'stack' {
  return value === 'message' || value === 'attributes' || value === 'stack';
}

export function writeLogDisplayPreferences(
  preferences: ExploreLogDisplayPreferences,
  scope?: ExploreLogPreferenceScope
) {
  if (!scope) return;
  try {
    window.localStorage.setItem(exploreLogPreferenceKey('display', scope), JSON.stringify(preferences));
  } catch {
    // The current view still owns the preference when persistence is unavailable.
  }
}
