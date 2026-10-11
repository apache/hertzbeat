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

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import type { MonitorMetricCatalogEvidence } from '../model/monitor-detail-model';
import type { MonitorInvestigationViewState } from '../model/monitor-investigation-model';
import { MonitorSignalView } from './monitor-signal-view';

const nativeMetrics: MonitorMetricCatalogEvidence = { kind: 'ready', options: [] };

describe('MonitorSignalView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it('keeps alerts, collection, entity, and observed OTLP evidence in separate deterministic sections', () => {
    const openSignal = vi.fn();
    const openEntity = vi.fn();
    const state = readyState();
    if (state.kind !== 'ready') throw new Error('fixture');
    renderView(state, { openSignal, openEntity });

    const headings = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent);
    expect(headings).toEqual([
      i18n.t('monitorSignals.sections.currentAlerts'),
      i18n.t('monitorSignals.sections.collectionHealth'),
      i18n.t('monitorSignals.sections.boundEntity'),
      i18n.t('monitorSignals.sections.otelEvidence')
    ]);
    expect(screen.getByText(i18n.t('monitorSignals.alerts.scope'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitorSignals.collection.outcomes.failure'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitorSignals.collection.failureClasses.UNREACHABLE'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitorSignals.collection.phases.CONNECT'))).toBeInTheDocument();
    expect(screen.queryByText('UNREACHABLE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitorSignals.otel.open', { signal: 'Logs' }) }));
    expect(openSignal).toHaveBeenCalledWith('logs');
    expect(screen.queryByRole('button', { name: /Traces/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('monitorSignals.entity.open') }));
    expect(openEntity).toHaveBeenCalledWith(17, state.window);
  });

  it('keeps collection and current alerts useful when no Entity is bound', () => {
    const state = readyState();
    if (state.kind !== 'ready') throw new Error('fixture');
    state.snapshot.binding = { state: 'empty', identity: null };
    renderView(state);

    expect(screen.getByText('collector-a')).toBeInTheDocument();
    expect(screen.getByText('Target unreachable')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: i18n.t('monitorSignals.sections.boundEntity') })).getByText(
        i18n.t('monitorSignals.entity.empty')
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: i18n.t('monitorSignals.sections.otelEvidence') })).getByText(
        i18n.t('monitorSignals.otel.noEntity')
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open .* in Explore/ })).not.toBeInTheDocument();
  });

  it('visibly distinguishes unresolved evidence from explicit empty evidence', () => {
    const ready = readyState();
    if (ready.kind !== 'ready') throw new Error('fixture');
    const loading: MonitorInvestigationViewState = {
      kind: 'loading',
      window: ready.window
    };
    const { rerender } = renderView(loading);
    expect(screen.getAllByText(i18n.t('monitorSignals.states.unknown')).length).toBeGreaterThan(0);
    expect(screen.queryByText(i18n.t('monitorSignals.collection.empty'))).not.toBeInTheDocument();

    const empty = readyState();
    if (empty.kind !== 'ready') throw new Error('fixture');
    empty.snapshot.collection = { state: 'empty', source: 'greptime_collection_events', event: null };
    empty.snapshot.alerts = {
      state: 'empty',
      source: 'current_alerts',
      scope: 'current',
      activeCount: 0,
      previews: []
    };
    rerender(viewNode(empty));

    expect(screen.getByText(i18n.t('monitorSignals.collection.empty'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('monitorSignals.alerts.empty'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('monitorSignals.collection.healthy'))).not.toBeInTheDocument();
  });

  it('keeps nullable facts neutral for a ready alert', () => {
    const state = readyState();
    if (state.kind !== 'ready' || state.snapshot.alerts.state !== 'ready') throw new Error('fixture');
    state.snapshot.alerts.previews[0] = {
      ...state.snapshot.alerts.previews[0]!,
      summary: null,
      severity: null,
      activeAt: null
    };

    renderView(state);

    const alerts = screen.getByRole('region', { name: i18n.t('monitorSignals.sections.currentAlerts') });
    expect(within(alerts).getAllByText(i18n.t('monitorSignals.alerts.notRecorded'))).toHaveLength(3);
    expect(within(alerts).queryByText(i18n.t('common.unavailable'))).not.toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('monitorSignals.states.ready')).length).toBeGreaterThan(0);
  });

  it('keeps a ready collection neutral when duration and collector were not recorded', () => {
    const state = readyState();
    if (state.kind !== 'ready' || state.snapshot.collection.state !== 'ready') throw new Error('fixture');
    state.snapshot.collection.event.durationMillis = -1;
    state.snapshot.collection.event.collectorId = '';

    renderView(state);

    const collection = screen.getByRole('region', { name: i18n.t('monitorSignals.sections.collectionHealth') });
    expect(within(collection).getAllByText(i18n.t('monitorSignals.collection.notRecorded'))).toHaveLength(2);
    expect(within(collection).queryByText(i18n.t('common.unavailable'))).not.toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('monitorSignals.states.ready')).length).toBeGreaterThan(0);
  });
});

function renderView(
  state: MonitorInvestigationViewState,
  actions: {
    openSignal?: (signal: 'metrics' | 'logs' | 'traces') => void;
    openEntity?: (id: number, window: Extract<MonitorInvestigationViewState, { kind: 'ready' }>['window']) => void;
  } = {}
) {
  return render(viewNode(state, actions));
}

function viewNode(
  state: MonitorInvestigationViewState,
  actions: {
    openSignal?: (signal: 'metrics' | 'logs' | 'traces') => void;
    openEntity?: (id: number, window: Extract<MonitorInvestigationViewState, { kind: 'ready' }>['window']) => void;
  } = {}
) {
  return (
    <I18nextProvider i18n={i18n}>
      <MonitorSignalView
        state={state}
        nativeMetrics={nativeMetrics}
        openSignal={actions.openSignal ?? vi.fn()}
        openEntity={actions.openEntity ?? vi.fn()}
      />
    </I18nextProvider>
  );
}

function readyState(): MonitorInvestigationViewState {
  const window = { from: 1_750_000_000_000, to: 1_750_003_600_000, timeZone: 'Asia/Shanghai' };
  return {
    kind: 'ready',
    window,
    snapshot: {
      monitorId: 7,
      window: { start: window.from, end: window.to },
      collection: {
        state: 'ready',
        source: 'greptime_collection_events',
        event: {
          observedAt: window.to - 1_000,
          durationMillis: 125,
          outcome: 'FAILURE',
          collectorId: 'collector-a',
          target: '10.0.0.8:3306',
          metricSet: 'summary',
          failureClass: 'UNREACHABLE',
          phase: 'CONNECT',
          fieldCount: 0,
          rowCount: 0
        }
      },
      alerts: {
        state: 'ready',
        source: 'current_alerts',
        scope: 'current',
        activeCount: 1,
        previews: [
          { id: 9, status: 'firing', severity: null, summary: 'Target unreachable', activeAt: 1_749_999_000_000 }
        ]
      },
      binding: {
        state: 'ready',
        identity: {
          monitorId: 7,
          entityId: 17,
          entityType: 'service',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          environment: 'production',
          signals: ['metrics', 'logs']
        }
      }
    }
  };
}
