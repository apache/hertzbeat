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
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';

import type { LogExploreQuery } from '../model/explore-query';
import { DEFAULT_LOG_DISPLAY_PREFERENCES } from '../model/explore-log-display-preferences';
import type { ExploreLogDisplayPreferences } from './explore-log-display-preferences';
import { ExploreLogResultOptions } from './explore-log-result-options';

afterEach(cleanup);

it('dismisses the Options popover with Escape and returns keyboard focus to its trigger', async () => {
  render(
    <ExploreLogResultOptions
      query={{ signal: 'logs', query: '' } as LogExploreQuery}
      preferences={DEFAULT_LOG_DISPLAY_PREFERENCES}
      onPreferencesChange={vi.fn()}
      t={((key: string) => key) as TFunction}
    />
  );
  const trigger = screen.getByRole('button', { name: 'explore.perses.options' });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const preference = await screen.findByRole('switch', { name: 'explore.perses.showDateColumn' });
  preference.focus();
  fireEvent.keyDown(preference, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(trigger).toHaveFocus();
});

it('omits unavailable sorting in Live Tail options', async () => {
  render(
    <ExploreLogResultOptions
      query={{ signal: 'logs', live: true } as LogExploreQuery}
      preferences={DEFAULT_LOG_DISPLAY_PREFERENCES}
      onPreferencesChange={vi.fn()}
      t={((key: string) => key) as TFunction}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.perses.options' }));
  await screen.findByRole('switch', { name: 'explore.perses.showDateColumn' });
  expect(screen.queryByRole('group', { name: 'explore.logColumns.sort' })).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'explore.perses.contentDisplay' })).not.toBeInTheDocument();
  expect(screen.queryByRole('switch', { name: 'explore.perses.timelineGraph' })).not.toBeInTheDocument();
  expect(screen.queryByRole('switch', { name: 'explore.perses.standardizeHeaders' })).not.toBeInTheDocument();
  expect(screen.getByRole('radiogroup', { name: 'explore.perses.rowHeight' })).toBeInTheDocument();
});

it('applies one row height and one history display mode', async () => {
  const preferences = {
    ...DEFAULT_LOG_DISPLAY_PREFERENCES,
    rowHeight: 'medium',
    contentDisplay: 'attributes',
    showContent: true
  } as ExploreLogDisplayPreferences;
  const onPreferencesChange = vi.fn();
  render(
    <ExploreLogResultOptions
      query={{ signal: 'logs', query: '' } as LogExploreQuery}
      preferences={preferences}
      onPreferencesChange={onPreferencesChange}
      t={((key: string) => key) as TFunction}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.perses.options' }));
  const height = await screen.findByRole('radiogroup', { name: 'explore.perses.rowHeight' });
  const display = screen.getByRole('radiogroup', { name: 'explore.perses.contentDisplay' });
  expect(screen.getByRole('radio', { name: 'explore.perses.rowHeightLarge' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'explore.perses.rowHeightLarge' }));
  expect(onPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, rowHeight: 'large' });
  fireEvent.click(display.querySelector('[value="message"]')!);
  expect(onPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, contentDisplay: 'message' });
  expect(height).toBeInTheDocument();
});

it('toggles Date and Content columns and History-only presentation options', async () => {
  const preferences = {
    ...DEFAULT_LOG_DISPLAY_PREFERENCES,
    rowHeight: 'small',
    contentDisplay: 'message',
    showContent: true,
    showTimeline: true,
    standardizeHeaders: true
  } as ExploreLogDisplayPreferences;
  const onPreferencesChange = vi.fn();
  render(
    <ExploreLogResultOptions
      query={{ signal: 'logs', query: '' } as LogExploreQuery}
      preferences={preferences}
      onPreferencesChange={onPreferencesChange}
      t={((key: string) => key) as TFunction}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'explore.perses.options' }));
  const date = await screen.findByRole('switch', { name: 'explore.perses.showDateColumn' });
  const content = screen.getByRole('switch', { name: 'explore.perses.showContentColumn' });
  expect(date).toBeChecked();
  fireEvent.click(date);
  expect(onPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, showTime: false });
  fireEvent.click(content);
  expect(onPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, showContent: false });
  fireEvent.click(screen.getByRole('switch', { name: 'explore.perses.timelineGraph' }));
  expect(onPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, showTimeline: false });
  fireEvent.click(screen.getByRole('switch', { name: 'explore.perses.standardizeHeaders' }));
  expect(onPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, standardizeHeaders: false });
});
