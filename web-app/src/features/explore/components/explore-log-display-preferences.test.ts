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

import { beforeEach, describe, expect, it } from 'vitest';
import { exploreLogPreferenceKey } from '../model/explore-log-display-preferences';

import {
  DEFAULT_LOG_DISPLAY_PREFERENCES,
  readLogDisplayPreferences,
  writeLogDisplayPreferences
} from './explore-log-display-preferences';

describe('Explore log display preferences', () => {
  beforeEach(() => localStorage.clear());
  const scope = { workspaceId: 'workspace-one', username: 'alice' };

  it('isolates stored preferences by authenticated workspace and user', () => {
    const scope = { workspaceId: 'workspace-one', username: 'alice' };
    writeLogDisplayPreferences({ ...DEFAULT_LOG_DISPLAY_PREFERENCES, rowHeight: 'large' }, scope);

    expect(readLogDisplayPreferences(scope).rowHeight).toBe('large');
    expect(readLogDisplayPreferences({ workspaceId: 'workspace-one', username: 'bob' })).toEqual(
      DEFAULT_LOG_DISPLAY_PREFERENCES
    );
    expect(readLogDisplayPreferences({ workspaceId: 'workspace-two', username: 'alice' })).toEqual(
      DEFAULT_LOG_DISPLAY_PREFERENCES
    );
    expect(readLogDisplayPreferences()).toEqual(DEFAULT_LOG_DISPLAY_PREFERENCES);
  });

  it('uses stable defaults and persists a valid preference set', () => {
    expect(readLogDisplayPreferences(scope)).toEqual(DEFAULT_LOG_DISPLAY_PREFERENCES);

    writeLogDisplayPreferences(
      {
        density: 'compact',
        wrap: false,
        showTime: false,
        rowHeight: 'large',
        contentDisplay: 'attributes',
        showContent: false,
        standardizeHeaders: true,
        showTimeline: true
      },
      scope
    );

    expect(readLogDisplayPreferences(scope)).toEqual({
      density: 'compact',
      wrap: false,
      showTime: false,
      rowHeight: 'large',
      contentDisplay: 'attributes',
      showContent: false,
      standardizeHeaders: true,
      showTimeline: true
    });
  });

  it.each([false, true])('uses wrapping, not density, to migrate scoped preferences (wrap=%s)', wrap => {
    localStorage.setItem(exploreLogPreferenceKey('display', scope), JSON.stringify({ density: 'comfortable', wrap }));
    expect(readLogDisplayPreferences(scope).rowHeight).toBe(wrap ? 'large' : 'small');
  });

  it('ignores legacy unscoped preferences instead of sharing them across users', () => {
    localStorage.setItem('hertzbeat.explore.logs.display', '{"density":"comfortable","wrap":false,"showTime":false}');

    expect(readLogDisplayPreferences(scope)).toEqual(DEFAULT_LOG_DISPLAY_PREFERENCES);
  });

  it('does not allow malformed local storage to change the display contract', () => {
    localStorage.setItem(
      'hertzbeat.explore.logs.display.v1.["workspace-one","alice"]',
      '{"density":"tiny","wrap":"yes"}'
    );

    expect(readLogDisplayPreferences(scope)).toEqual(DEFAULT_LOG_DISPLAY_PREFERENCES);
  });

  it('ignores oversized stored preferences', () => {
    localStorage.setItem('hertzbeat.explore.logs.display.v1.["workspace-one","alice"]', ' '.repeat(65_537));
    expect(readLogDisplayPreferences(scope)).toEqual(DEFAULT_LOG_DISPLAY_PREFERENCES);
  });
});
