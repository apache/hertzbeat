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

import { z } from 'zod';

import type { SavedQueryRecord } from './explore-saved-query-model';

export const savedViewSortOptions = ['default', 'recent', 'newest', 'oldest', 'az', 'za'] as const;
export type SavedViewSort = (typeof savedViewSortOptions)[number];
export type SavedViewDirectoryPreferences = {
  sort: SavedViewSort;
  onlyMine: boolean;
  favoriteKeys: string[];
  recentKeys: string[];
};

const emptyPreferences: SavedViewDirectoryPreferences = {
  sort: 'default',
  onlyMine: false,
  favoriteKeys: [],
  recentKeys: []
};
const preferencesSchema = z.object({
  sort: z.enum(savedViewSortOptions).default('default'),
  onlyMine: z.boolean().default(false),
  favoriteKeys: z.array(z.string().max(128)).max(1000).default([]),
  recentKeys: z.array(z.string().max(128)).max(1000).default([])
});

export function savedViewDirectoryKey(workspaceId: string, username: string) {
  return `hertzbeat.explore.saved-views.v1.${JSON.stringify([workspaceId, username])}`;
}

export function readSavedViewDirectoryPreferences(raw: string | null): SavedViewDirectoryPreferences {
  try {
    if (raw && raw.length > 512 * 1024) return emptyPreferences;
    const parsed = preferencesSchema.safeParse(JSON.parse(raw ?? '{}'));
    return parsed.success ? parsed.data : emptyPreferences;
  } catch {
    return emptyPreferences;
  }
}

export function boundSavedViewDirectoryPreferences(
  preferences: SavedViewDirectoryPreferences,
  records: SavedQueryRecord[]
): SavedViewDirectoryPreferences {
  const keys = new Set(records.map(record => record.viewKey));
  return {
    ...preferences,
    favoriteKeys: preferences.favoriteKeys.filter(key => keys.has(key)).slice(0, 1000),
    recentKeys: preferences.recentKeys.filter(key => keys.has(key)).slice(0, 1000)
  };
}

export function orderSavedViews(records: SavedQueryRecord[], preferences: SavedViewDirectoryPreferences) {
  const favorites = new Set(preferences.favoriteKeys);
  const recent = new Map(preferences.recentKeys.map((key, index) => [key, index]));
  const byKey = (left: SavedQueryRecord, right: SavedQueryRecord) => left.viewKey.localeCompare(right.viewKey);
  const byUpdate = (left: SavedQueryRecord, right: SavedQueryRecord) =>
    (right.updateTime ?? right.createTime ?? '').localeCompare(left.updateTime ?? left.createTime ?? '') ||
    byKey(left, right);
  const byCreated = (left: SavedQueryRecord, right: SavedQueryRecord) =>
    (right.createTime ?? right.updateTime ?? '').localeCompare(left.createTime ?? left.updateTime ?? '') ||
    byKey(left, right);
  const byLabel = (left: SavedQueryRecord, right: SavedQueryRecord) =>
    left.label.localeCompare(right.label) || byKey(left, right);
  const sorted = [...records].sort((left, right) => {
    switch (preferences.sort) {
      case 'recent':
        return (
          (recent.get(left.viewKey) ?? Infinity) - (recent.get(right.viewKey) ?? Infinity) || byUpdate(left, right)
        );
      case 'newest':
        return byCreated(left, right);
      case 'oldest':
        return byCreated(right, left);
      case 'az':
        return byLabel(left, right);
      case 'za':
        return byLabel(right, left);
      default:
        return 0;
    }
  });
  return preferences.sort === 'default'
    ? sorted.sort((left, right) => Number(favorites.has(right.viewKey)) - Number(favorites.has(left.viewKey)))
    : sorted;
}

export function toggleSavedViewFavorite(preferences: SavedViewDirectoryPreferences, viewKey: string) {
  const favoriteKeys = preferences.favoriteKeys.includes(viewKey)
    ? preferences.favoriteKeys.filter(key => key !== viewKey)
    : [viewKey, ...preferences.favoriteKeys];
  return { ...preferences, favoriteKeys: favoriteKeys.slice(0, 1000) };
}

export function recordSavedViewOpen(preferences: SavedViewDirectoryPreferences, viewKey: string) {
  if (preferences.recentKeys[0] === viewKey) return preferences;
  return {
    ...preferences,
    recentKeys: [viewKey, ...preferences.recentKeys.filter(key => key !== viewKey)].slice(0, 1000)
  };
}
