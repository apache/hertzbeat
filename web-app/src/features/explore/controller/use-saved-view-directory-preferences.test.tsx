/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSavedViewDirectoryPreferences } from './use-saved-view-directory-preferences';

afterEach(() => localStorage.clear());

describe('saved view directory persistence', () => {
  it('keeps a direct-open recent view when the next action changes a favorite', () => {
    const records = [
      { signal: 'logs' as const, viewKey: 'opened', label: 'Opened', route: '/explore?signal=logs' },
      { signal: 'logs' as const, viewKey: 'favorite', label: 'Favorite', route: '/explore?signal=logs' }
    ];
    const { result } = renderHook(() =>
      useSavedViewDirectoryPreferences({ workspaceId: 'space', username: 'operator' }, records, true, 'opened')
    );
    act(() => result.current.toggleFavorite('favorite'));
    expect(result.current.preferences).toMatchObject({ recentKeys: ['opened'], favoriteKeys: ['favorite'] });
  });
});
