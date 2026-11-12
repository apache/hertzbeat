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
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import type { DashboardTraceSignals } from '../model/dashboard-signals';
import { DashboardTracePreview } from './dashboard-trace-preview';
const row = traceEvidenceFixture({
  status: 'ERROR',
  durationNanos: 100000,
  errorSpanCount: 1,
  serviceStats: { checkout: { spanCount: 1, errorCount: 1 } }
});
const ready = <T,>(data: T) => ({
  isSuccess: true as const,
  isPending: false as const,
  isFetching: false,
  error: null,
  data
});
const pending = { isSuccess: false as const, isPending: true, isFetching: true, error: null };
function signals(
  errorCount: number,
  samples: DashboardTraceSignals['traceSamples'] = ready({ state: 'ready', rows: [] })
): DashboardTraceSignals {
  return {
    clock: { start: 1750000000000, end: 1750000900000, hidden: false, reducedMotion: false, refresh: () => {} },
    serviceName: 'checkout',
    environment: 'production',
    traces: ready({
      state: 'ready',
      coverage: { mode: 'window', rowLimit: null, scannedRows: null, truncated: false },
      population: 'matched_traces',
      window: { start: 1750000000000, end: 1750000900000, endExclusive: false },
      data: { totalCount: 5, errorCount, intervalMs: 900000, buckets: [] }
    }),
    traceSamples: samples
  } satisfies DashboardTraceSignals;
}
function ExploreProof() {
  const location = useLocation();
  return (
    <>
      <p data-testid="destination">{location.search}</p>
      <Link to="/dashboard">Return to Start</Link>
    </>
  );
}
function view(state: DashboardTraceSignals) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardTracePreview signals={state} />} />
          <Route path="/explore" element={<ExploreProof />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}
describe('honest trace anomaly states', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('zh-CN');
    await i18n.changeLanguage('zh-CN');
  });
  afterEach(cleanup);
  it('omits redundant card time and coverage captions while preserving the exact destination window', () => {
    view(signals(0));
    expect(screen.queryByText(i18n.t('dashboard.v2.last15m'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('dashboard.v2.fullWindow'))).not.toBeInTheDocument();
    expect(screen.queryByTitle(i18n.t('dashboard.v2.tracePopulation'))).not.toBeInTheDocument();
    const target = new URL(
      screen.getByRole('link', { name: i18n.t('dashboard.v3.openExplore') }).getAttribute('href')!,
      'http://local'
    );
    expect(target.searchParams.get('start')).toBe('1750000000000');
    expect(target.searchParams.get('end')).toBe('1750000900000');
  });
  it('only claims no anomalies after a successful zero in full-window evidence', () => {
    view(signals(0, pending));
    expect(screen.getByText(i18n.t('dashboard.v3.noErrorTraces'))).toBeVisible();
  });
  it('shows two actual error rows and carries trace identity, scope and window into Explore and back', () => {
    const second = { ...row, traceId: '11111111111111111111111111111111', rootSpanName: 'GET /inventory' };
    view(signals(2, ready({ state: 'ready', rows: [row, second] })));
    expect(screen.getByText('POST /orders')).toBeVisible();
    expect(screen.getByText('GET /inventory')).toBeVisible();
    expect(screen.queryByText(i18n.t('dashboard.v3.noErrorTraces'))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /POST \/orders/ }));
    const target = new URLSearchParams(screen.getByTestId('destination').textContent ?? '');
    expect(Object.fromEntries(target)).toMatchObject({
      signal: 'traces',
      traceId: row.traceId,
      errorOnly: 'true',
      serviceName: 'checkout',
      environment: 'production',
      start: '1750000000000',
      end: '1750000900000'
    });
    fireEvent.click(screen.getByRole('link', { name: 'Return to Start' }));
    expect(screen.getByText('POST /orders')).toBeVisible();
  });
  it.each([
    [pending, 'dashboard.v3.traceSamplesLoading'],
    [
      { isSuccess: false, isPending: false, isFetching: false, error: new Error('failed') },
      'dashboard.v3.traceSamplesFailed'
    ],
    [ready({ state: 'unsupported', rows: [] }), 'dashboard.v3.traceSamplesUnsupported'],
    [ready({ state: 'ready', rows: [] }), 'dashboard.v3.traceSamplesMissing']
  ] as const)('distinguishes unresolved/error/unsupported/missing samples from zero', (read, message) => {
    view(signals(2, read as DashboardTraceSignals['traceSamples']));
    expect(screen.getByText(i18n.t(message))).toBeVisible();
    expect(screen.queryByText(i18n.t('dashboard.v3.noErrorTraces'))).not.toBeInTheDocument();
  });
  it('does not keep stale sample rows visible while refetching a changed scope', () => {
    view(signals(2, { ...ready({ state: 'ready', rows: [row] }), isFetching: true }));
    expect(screen.getByText(i18n.t('dashboard.v3.traceSamplesLoading'))).toBeVisible();
    expect(screen.queryByText('POST /orders')).not.toBeInTheDocument();
  });
  it('does not claim a global zero from bounded coverage', () => {
    const state = signals(0);
    if (!state.traces.isSuccess) throw new Error('Expected ready traces');
    state.traces.data.coverage = { mode: 'bounded', rowLimit: 1500, scannedRows: 5, truncated: false };
    view(state);
    expect(screen.queryByText(i18n.t('dashboard.v3.noErrorTraces'))).not.toBeInTheDocument();
  });
});
