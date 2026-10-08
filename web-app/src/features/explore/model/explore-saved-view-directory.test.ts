/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import type { SavedQueryRecord } from './explore-saved-query-model';
import {
  boundSavedViewDirectoryPreferences,
  orderSavedViews,
  readSavedViewDirectoryPreferences,
  recordSavedViewOpen,
  savedViewDirectoryKey,
  toggleSavedViewFavorite
} from './explore-saved-view-directory';

const records = [
  {
    viewKey: 'b',
    label: 'Beta',
    createTime: '2026-01-01T00:00:00',
    updateTime: '2026-01-03T00:00:00',
    creator: 'other'
  },
  { viewKey: 'a', label: 'Alpha', createTime: '2026-01-02T00:00:00', updateTime: '2026-01-01T00:00:00', creator: 'me' }
] as SavedQueryRecord[];

describe('saved view directory preferences', () => {
  it('scopes preferences per workspace and account and ignores malformed storage', () => {
    expect(savedViewDirectoryKey('space', 'me')).not.toBe(savedViewDirectoryKey('space', 'other'));
    expect(readSavedViewDirectoryPreferences('{bad')).toMatchObject({ sort: 'default', onlyMine: false });
    expect(readSavedViewDirectoryPreferences(' '.repeat(512 * 1024 + 1))).toMatchObject({
      favoriteKeys: [],
      recentKeys: []
    });
  });

  it('orders favorites first by default and supports the directory sort modes', () => {
    const preferences = { sort: 'default' as const, onlyMine: false, favoriteKeys: ['b'], recentKeys: ['a'] };
    expect(orderSavedViews(records, preferences).map(item => item.viewKey)).toEqual(['b', 'a']);
    expect(orderSavedViews(records, { ...preferences, sort: 'recent' }).map(item => item.viewKey)).toEqual(['a', 'b']);
    expect(orderSavedViews(records, { ...preferences, sort: 'newest' }).map(item => item.viewKey)).toEqual(['a', 'b']);
    expect(orderSavedViews(records, { ...preferences, sort: 'oldest' }).map(item => item.viewKey)).toEqual(['b', 'a']);
    expect(orderSavedViews(records, { ...preferences, sort: 'az' }).map(item => item.viewKey)).toEqual(['a', 'b']);
  });

  it('bounds local metadata to existing catalog records and updates favorites/recent views', () => {
    const preferences = {
      sort: 'default' as const,
      onlyMine: false,
      favoriteKeys: ['b', 'gone'],
      recentKeys: ['a', 'gone']
    };
    expect(boundSavedViewDirectoryPreferences(preferences, records)).toMatchObject({
      favoriteKeys: ['b'],
      recentKeys: ['a']
    });
    expect(toggleSavedViewFavorite(preferences, 'b').favoriteKeys).toEqual(['gone']);
    expect(recordSavedViewOpen(preferences, 'b').recentKeys).toEqual(['b', 'a', 'gone']);
  });
});
