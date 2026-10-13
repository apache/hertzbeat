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

import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { ExplorePageResultState } from '../model/explore-result-model';
import { ExploreResultAnnouncer } from './explore-result-announcer';
import { ExploreResultFrame } from './explore-state-panel';

describe('ExploreResultAnnouncer', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('announces completion and count changes once, then clears the bounded live region', async () => {
    vi.useFakeTimers();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ExploreResultAnnouncer result={logResult(1, 1)} queryIdentity="/explore?signal=logs" t={i18n.t} />
      </I18nextProvider>
    );
    const status = screen.getByRole('status', { name: 'Explore query updates' });
    expect(status).toHaveTextContent('Query complete. 1 result.');

    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreResultAnnouncer result={logResult(1, 1)} queryIdentity="/explore?signal=logs" t={i18n.t} />
      </I18nextProvider>
    );
    expect(status).toHaveTextContent('Query complete. 1 result.');

    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreResultAnnouncer result={logResult(1, 2)} queryIdentity="/explore?signal=logs" t={i18n.t} />
      </I18nextProvider>
    );
    expect(status).toHaveTextContent('Query complete. 1 result.');

    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreResultAnnouncer result={logResult(2, 3)} queryIdentity="/explore?signal=logs" t={i18n.t} />
      </I18nextProvider>
    );
    expect(status).toHaveTextContent('Result count changed to 2.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(status).toBeEmptyDOMElement();
  });

  it('announces a new query even when its evidence revision is unchanged', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <ExploreResultAnnouncer result={logResult(1, 1)} queryIdentity="/explore?signal=logs" t={i18n.t} />
      </I18nextProvider>
    );
    const status = screen.getByRole('status', { name: 'Explore query updates' });
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ExploreResultAnnouncer
          result={logResult(2, 1)}
          queryIdentity="/explore?signal=logs&severity=error"
          t={i18n.t}
        />
      </I18nextProvider>
    );
    expect(status).toHaveTextContent('Query complete. 2 results.');
  });

  it('keeps mutable result content outside the live region to avoid duplicate announcements', () => {
    const view = render(<ExploreResultFrame>result content</ExploreResultFrame>);
    expect(view.getByText('result content')).not.toHaveAttribute('aria-live');
    expect(view.container.querySelector('[aria-live]')).toBeNull();
  });
});

function logResult(totalElements: number, revision: number): ExplorePageResultState {
  return {
    kind: totalElements === 0 ? 'empty' : 'ready',
    signal: 'logs',
    data: { content: [], totalElements, totalPages: totalElements === 0 ? 0 : 1, number: 0, size: 20 },
    statistics: {
      overview: { kind: 'error' },
      trend: { kind: 'error' }
    },
    window: { from: 1_000, to: 2_000 },
    revision
  };
}
