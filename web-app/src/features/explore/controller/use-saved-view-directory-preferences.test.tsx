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
