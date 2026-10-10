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

import { resolveLogRowHeight, type LogView } from '@/platform/perses';
import type { ExploreLogDisplayPreferences } from './explore-log-display-preferences';
import type { LogColumn } from './explore-log-columns';

export function logViewDisplayPreferences(view: LogView): ExploreLogDisplayPreferences {
  return {
    density: view.density,
    wrap: view.wrap,
    showTime: view.columns.some(column => column.kind === 'time'),
    rowHeight: resolveLogRowHeight(view),
    contentDisplay: view.contentDisplay ?? 'message',
    showContent: view.showContent ?? view.columns.some(column => column.kind === 'message'),
    standardizeHeaders: view.standardizeHeaders ?? true,
    showTimeline: view.showTimeline ?? true,
    columnOrder: view.columns
  };
}

export function normalizeLogViewPreferenceChange(view: LogView, preferences: ExploreLogDisplayPreferences) {
  const rowHeight = resolveLogRowHeight(preferences);
  const nextPreferences: ExploreLogDisplayPreferences = {
    density: rowHeight === 'small' ? 'compact' : 'comfortable',
    wrap: rowHeight === 'large',
    showTime: preferences.showTime,
    rowHeight,
    contentDisplay: preferences.contentDisplay ?? 'message',
    showContent: preferences.showContent ?? true,
    standardizeHeaders: preferences.standardizeHeaders ?? true,
    showTimeline: preferences.showTimeline ?? true,
    columnOrder: logViewTimeColumns(view.columns, preferences.showTime)
  };
  return {
    preferences: nextPreferences,
    view: {
      ...view,
      density: nextPreferences.density,
      wrap: nextPreferences.wrap,
      rowHeight: nextPreferences.rowHeight,
      contentDisplay: nextPreferences.contentDisplay,
      showContent: nextPreferences.showContent,
      standardizeHeaders: nextPreferences.standardizeHeaders,
      showTimeline: nextPreferences.showTimeline,
      columns: logViewTimeColumns(view.columns, nextPreferences.showTime)
    }
  };
}

export function logViewTimeColumns(columns: LogColumn[], show: boolean): LogColumn[] {
  if (!show) return columns.filter(column => column.kind !== 'time');
  return columns.some(column => column.kind === 'time') ? columns : [{ kind: 'time' }, ...columns];
}

export function logColumnDisplayPreferences(preferences: ExploreLogDisplayPreferences, columns: LogColumn[]) {
  return { ...preferences, columnOrder: columns, showTime: columns.some(column => column.kind === 'time') };
}
