/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import {
  PassportIntroduction,
  PASSPORT_INTRODUCTION_HOLD_MS,
  PASSPORT_INTRODUCTION_ROLL_MS,
  PASSPORT_INTRODUCTION_TYPE_MS
} from './passport-introduction';

describe('PassportIntroduction', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the brand and positioning stable while every capability is typed in place', async () => {
    vi.useFakeTimers();
    useReducedMotion(false);
    renderIntroduction();

    expect(
      screen.getByRole('heading', {
        name: 'Apache HertzBeat™ brings together agentless monitoring, metrics, logs, traces, extensible collection, distributed reach, alerting, self-hosting, and AI.'
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId('passport-introduction-brand')).toHaveAttribute(
      'src',
      '/assets/hertzbeat-brand-white.svg'
    );
    expect(screen.getByTestId('passport-introduction-brand')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('passport-introduction-positioning')).toHaveTextContent(
      'Open-source monitoring and observability for infrastructure and applications'
    );
    expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent('');
    expect(screen.getByTestId('passport-introduction-measure')).toHaveTextContent(
      'Agentless monitoring across infrastructure'
    );
    expect(screen.getByTestId('passport-introduction-cursor')).toBeInTheDocument();
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();

    const phrases = [
      'Agentless monitoring across infrastructure',
      'Metrics, logs, and traces in one view',
      'Extensible collection, reusable definitions',
      'Distributed collection across isolated networks',
      'Alerts, notifications, and status publishing in one place',
      'Self-hosted, with your data under control',
      'AI for queries, diagnosis, and action'
    ] as const;

    await typePhrase(phrases[0]);
    expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent(phrases[0]);

    for (let index = 1; index < phrases.length; index += 1) {
      const current = phrases[index - 1] ?? '';
      const next = phrases[index] ?? '';
      await rollToNext(current, next);
      expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent(next);
    }

    await rollToNext(phrases.at(-1) ?? '', phrases[0]);
    expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent(phrases[0]);
    expect(screen.getAllByTestId('passport-introduction-phrase')).toHaveLength(1);
  });

  it('keeps the first product line static when reduced motion is requested', async () => {
    vi.useFakeTimers();
    useReducedMotion(true);
    renderIntroduction();

    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent(i18n.t('auth.passport.capability1'));
    expect(screen.queryByText(i18n.t('auth.passport.capability2'))).not.toBeInTheDocument();
    expect(screen.getAllByTestId('passport-introduction-phrase')).toHaveLength(1);
    expect(screen.queryByTestId('passport-introduction-cursor')).not.toBeInTheDocument();
  });
});

async function typePhrase(phrase: string) {
  for (let index = 0; index < Array.from(phrase).length; index += 1) {
    await act(() => vi.advanceTimersByTimeAsync(PASSPORT_INTRODUCTION_TYPE_MS));
  }
}

async function rollToNext(current: string, next: string) {
  await act(() => vi.advanceTimersByTimeAsync(PASSPORT_INTRODUCTION_HOLD_MS));
  expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent(current);
  expect(screen.getByTestId('passport-introduction-stage')).toHaveAttribute('data-typewriter-phase', 'rolling');
  await act(() => vi.advanceTimersByTimeAsync(PASSPORT_INTRODUCTION_ROLL_MS));
  expect(screen.getByTestId('passport-introduction-phrase')).toHaveTextContent('');
  await typePhrase(next);
}

function renderIntroduction() {
  return render(
    <I18nextProvider i18n={i18n}>
      <PassportIntroduction />
    </I18nextProvider>
  );
}

function useReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && reduced,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  );
}
