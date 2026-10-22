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

import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { MonitorHistoryChart } from '../model/monitor-detail-model';
import type { MonitorInvestigationViewState } from '../model/monitor-investigation-model';
import { HistoryChartEvidence } from './monitor-history-chart';
import { MonitorSignalAvailability } from './monitor-signal-availability';
import { MonitorSignalCollection } from './monitor-signal-collection';

const runtime = vi.hoisted(() => ({ update: vi.fn(), dispose: vi.fn(), create: vi.fn() }));
vi.mock('./monitor-history-chart-runtime', () => ({
  createMonitorHistoryChart: runtime.create.mockImplementation(() => runtime)
}));

beforeAll(async () => {
  await initializeI18n();
  await loadLocale('en-US');
});
afterEach(async () => {
  cleanup();
  await loadLocale('en-US');
});

it('updates the existing chart and collection timestamps when the interface language changes', async () => {
  const to = Date.UTC(2026, 9, 16, 13, 29, 8);
  const window = { from: to - 1_800_000, to, timeZone: 'Asia/Shanghai' };
  const state: MonitorInvestigationViewState = {
    kind: 'ready',
    window,
    snapshot: {
      monitorId: 7,
      window: { start: window.from, end: window.to },
      alerts: { state: 'empty', source: 'current_alerts', scope: 'current', activeCount: 0, previews: [] },
      binding: { state: 'empty', identity: null },
      collection: {
        state: 'ready',
        source: 'greptime_collection_events',
        event: {
          observedAt: to - 1_000,
          durationMillis: 1234,
          outcome: 'SUCCESS',
          collectorId: 'collector-a',
          target: '127.0.0.1',
          metricSet: 'processes',
          failureClass: 'NONE',
          phase: 'UNKNOWN',
          fieldCount: 2,
          rowCount: 75
        }
      }
    }
  };
  const chart: MonitorHistoryChart = {
    metric: { key: 'processes.working_set', group: 'processes', field: 'working_set', unit: 'B' },
    history: '30m',
    interval: false,
    result: { kind: 'ready', rows: [{ name: 'pid=4', points: [[to, 1_000_000_000]] }] }
  };
  const view = render(
    <I18nextProvider i18n={i18n}>
      <HistoryChartEvidence chart={chart} />
      <MonitorSignalAvailability nativeMetrics={{ kind: 'ready', options: [] }} state={state} />
      <MonitorSignalCollection state={state} />
    </I18nextProvider>
  );
  await waitFor(() => expect(runtime.create).toHaveBeenCalledOnce());
  expect(runtime.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: 'en-US' }));

  for (const locale of ['zh-CN', 'en-US', 'pt-BR', 'en-US'] as const) {
    await act(async () => {
      await loadLocale(locale);
    });
    await waitFor(() => expect(runtime.update).toHaveBeenLastCalledWith(expect.objectContaining({ locale })));
    const collection = screen.getByRole('region', { name: i18n.t('monitorSignals.sections.collectionHealth') });
    const expected = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: window.timeZone
    });
    expect(within(collection).getByText(expected.format(to - 1000))).toBeVisible();
    expect(
      screen.getByText(
        i18n.t('monitorSignals.window', {
          start: expected.format(window.from),
          end: expected.format(window.to),
          timeZone: window.timeZone
        })
      )
    ).toBeVisible();
  }
  view.rerender(
    <I18nextProvider i18n={i18n}>
      <HistoryChartEvidence chart={chart} title="Working set label" />
    </I18nextProvider>
  );
  expect(screen.getByRole('img', { name: 'Working set label' })).toHaveAttribute('title', 'processes.working_set');
  expect(runtime.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ title: 'Working set label', locale: 'en-US', series: chart.result.rows })
  );
  expect(runtime.create).toHaveBeenCalledOnce();
});
