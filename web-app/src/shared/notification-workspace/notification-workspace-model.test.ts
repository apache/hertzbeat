/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { settingsPaths } from '@/shared/settings/settings-routes';

import {
  notificationChannelStatus,
  notificationListStatus,
  notificationWorkspaceSteps
} from './notification-workspace-model';

describe('notification workspace model', () => {
  it('keeps the canonical dependency order and shared settings paths', () => {
    expect(notificationWorkspaceSteps.map(step => [step.id, step.path])).toEqual([
      ['channels', settingsPaths.channels],
      ['receivers', settingsPaths.receivers],
      ['templates', settingsPaths.templates],
      ['rules', settingsPaths.rules]
    ]);
  });

  it('derives channel status only from the two existing authoritative reads', () => {
    expect(notificationChannelStatus('configured', 'loading')).toBe('configured');
    expect(notificationChannelStatus('missing', 'missing')).toBe('empty');
    expect(notificationChannelStatus('loading', 'missing')).toBe('loading');
    expect(notificationChannelStatus('permission', 'missing')).toBe('permission');
    expect(notificationChannelStatus('unavailable', 'missing')).toBe('unavailable');
    expect(notificationChannelStatus('invalid', 'error')).toBe('unknown');
  });

  it('keeps empty, loading, unavailable, permission, and unknown list evidence distinct', () => {
    expect(notificationListStatus({ kind: 'ready', total: 3 })).toBe('configured');
    expect(notificationListStatus({ kind: 'ready', total: 0 })).toBe('empty');
    expect(notificationListStatus({ kind: 'empty' })).toBe('empty');
    expect(notificationListStatus({ kind: 'loading' })).toBe('loading');
    expect(notificationListStatus({ kind: 'permission' })).toBe('permission');
    expect(notificationListStatus({ kind: 'unavailable' })).toBe('unavailable');
    expect(notificationListStatus({ kind: 'invalid' })).toBe('unknown');
    expect(notificationListStatus({ kind: 'ready' } as never)).toBe('unknown');
    expect(notificationListStatus({ kind: 'ready', total: Number.NaN })).toBe('unknown');
    expect(notificationListStatus({ kind: 'ready', total: -1 })).toBe('unknown');
  });
});
