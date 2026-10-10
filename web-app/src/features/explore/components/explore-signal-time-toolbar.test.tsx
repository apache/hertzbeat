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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { initializeI18n, loadLocale, i18n } from '@/core/i18n/i18n';
import type { SharedTimeValue } from '@/shared/time';
import { ExploreSignalTimeToolbar } from './explore-signal-time-toolbar';
import toolbarStyles from './explore-signal-time-toolbar.module.css?raw';
import timeStyles from './explore-time-control.module.css?raw';
beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(cleanup);
it.each(['metrics', 'logs', 'traces'] as const)('delegates one refresh without a scope write for %s', signal => {
  const refresh = vi.fn().mockResolvedValue(undefined),
    updateScope = vi.fn(),
    setAutoRefresh = vi.fn();
  const time = {
    window: { from: 1788786000120, to: 1788787800340 },
    autoRefreshMs: 0,
    setAutoRefresh
  } as unknown as SharedTimeValue;
  render(
    <ExploreSignalTimeToolbar
      query={{ signal, timeRange: 'last-30m' }}
      time={time}
      t={i18n.t}
      updateScope={updateScope}
      refresh={refresh}
      capability={signal === 'logs' ? 'log_history' : 'polling'}
    />
  );
  expect(screen.getAllByRole('textbox', { name: i18n.t('explore.timeRange') })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') }));
  expect(refresh).toHaveBeenCalledOnce();
  expect(updateScope).not.toHaveBeenCalled();
  expect(setAutoRefresh).not.toHaveBeenCalled();
  expect(screen.queryByRole('combobox')).toBe(signal === 'logs' ? null : screen.getByRole('combobox'));
});
it('keeps the live stream capability distinct from a paused historical window', () => {
  const refresh = vi.fn(),
    updateScope = vi.fn();
  render(
    <ExploreSignalTimeToolbar
      query={{ signal: 'logs', timeRange: 'last-30m', live: true }}
      t={i18n.t}
      updateScope={updateScope}
      refresh={refresh}
      capability="log_stream"
      mode={<button>Stream mode</button>}
    />
  );
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: i18n.t('common.refresh') })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Stream mode' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: i18n.t('explore.timeControl.play') })).not.toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();
  expect(updateScope).not.toHaveBeenCalled();
});

it('wraps the full time group before the date inputs can be squeezed by source controls', () => {
  expect(toolbarStyles).toMatch(/\.toolbar\s*\{[^}]*flex-wrap:\s*wrap/s);
  expect(toolbarStyles).toMatch(/\.toolbar\s*\{[^}]*flex:\s*1 1 850px/s);
  expect(toolbarStyles).toMatch(/\.toolbar > :first-child\s*\{[^}]*flex:\s*1 1 630px/s);
  expect(toolbarStyles).toMatch(/\.toolbar > :first-child\s*\{[^}]*container-type:\s*inline-size/s);
  expect(timeStyles).toMatch(/@container \(width <= 750px\)/);
});
