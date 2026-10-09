/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
