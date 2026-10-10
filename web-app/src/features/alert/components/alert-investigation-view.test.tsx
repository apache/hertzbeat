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
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAlertInvestigationPersesResults } from '../model/alert-investigation-perses-model';
import { alertInvestigationSnapshot, alertReadyRoute } from '../model/alert-investigation-test-fixtures';
import { AlertInvestigationView } from './alert-investigation-view';

const runtime = vi.hoisted(() => ({ logs: vi.fn(), metrics: vi.fn() }));

vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  HertzBeatLogsTableResult: (props: { ariaLabel: string }) => {
    runtime.logs(props);
    return <div data-testid="perses-logs">{props.ariaLabel}</div>;
  },
  HertzBeatMetricTimeSeriesResult: (props: { ariaLabel: string }) => {
    runtime.metrics(props);
    return <div data-testid="perses-metric">{props.ariaLabel}</div>;
  }
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('AlertInvestigationView', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('focuses the alert heading and keeps the five signal regions in deterministic order', () => {
    const snapshot = alertInvestigationSnapshot();
    render(
      <AlertInvestigationView
        state={{
          kind: 'ready',
          route: alertReadyRoute(),
          snapshot,
          perses: createAlertInvestigationPersesResults(snapshot)
        }}
        onBack={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenTrace={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual([
      'alertInvestigation.sections.metrics',
      'alertInvestigation.sections.logs',
      'alertInvestigation.sections.traces',
      'alertInvestigation.sections.topology',
      'alertInvestigation.sections.collection'
    ]);
    expect(document.querySelector('[data-alert-investigation="true"]')).toBeInTheDocument();
    expect(screen.getAllByTestId('perses-metric')).toHaveLength(1);
    expect(screen.getByTestId('perses-logs')).toBeInTheDocument();
  });

  it('keeps unknown collection facts neutral while the collection block remains ready', () => {
    const snapshot = alertInvestigationSnapshot();
    render(
      <AlertInvestigationView
        state={{
          kind: 'ready',
          route: alertReadyRoute(),
          snapshot,
          perses: createAlertInvestigationPersesResults(snapshot)
        }}
        onBack={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenTrace={vi.fn()}
      />
    );

    const region = screen.getByRole('region', { name: 'alertInvestigation.sections.collection' });
    expect(within(region).getAllByText('alertInvestigation.collection.notRecorded').length).toBeGreaterThan(0);
    expect(region).not.toHaveTextContent('-1');
    expect(region.querySelector('[data-state="unavailable"]')).not.toBeInTheDocument();
  });

  it('uses exact trace evidence for the trace handoff and never starts a runtime for unavailable evidence', () => {
    const snapshot = alertInvestigationSnapshot();
    snapshot.metrics = { ...snapshot.metrics, state: 'unavailable', reason: 'query_strategy_unavailable', series: [] };
    snapshot.logs = { ...snapshot.logs, state: 'empty', reason: 'no_data', records: [] };
    const onOpenTrace = vi.fn();
    render(
      <AlertInvestigationView
        state={{
          kind: 'ready',
          route: alertReadyRoute(),
          snapshot,
          perses: createAlertInvestigationPersesResults(snapshot)
        }}
        onBack={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenTrace={onOpenTrace}
      />
    );

    expect(runtime.metrics).not.toHaveBeenCalled();
    expect(runtime.logs).not.toHaveBeenCalled();
    expect(screen.getAllByText('alertInvestigation.states.unavailable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('alertInvestigation.states.empty').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'alertInvestigation.actions.openTrace' }));
    expect(onOpenTrace).toHaveBeenCalledWith(snapshot.traces.traces[0]);
  });

  it('bounds focused log actions and labels each action with its lossless record UID', () => {
    const snapshot = alertInvestigationSnapshot();
    snapshot.logs.records = Array.from({ length: 7 }, (_, index) => ({
      ...snapshot.logs.records[0]!,
      logRecordUid: `log-${index + 1}`
    }));
    render(
      <AlertInvestigationView
        state={{
          kind: 'ready',
          route: alertReadyRoute(),
          snapshot,
          perses: createAlertInvestigationPersesResults(snapshot)
        }}
        onBack={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenTrace={vi.fn()}
      />
    );

    expect(screen.getAllByRole('button', { name: /alertInvestigation\.actions\.openLog:/u })).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'alertInvestigation.actions.openLog: log-1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'alertInvestigation.actions.openLog: log-6' })).not.toBeInTheDocument();
  });

  it('does not present failure diagnostics for a successful collection event', () => {
    const snapshot = alertInvestigationSnapshot();
    snapshot.collection.event = { ...snapshot.collection.event!, outcome: 'SUCCESS' };
    render(
      <AlertInvestigationView
        state={{
          kind: 'ready',
          route: alertReadyRoute(),
          snapshot,
          perses: createAlertInvestigationPersesResults(snapshot)
        }}
        onBack={vi.fn()}
        onOpenLog={vi.fn()}
        onOpenTrace={vi.fn()}
      />
    );

    const region = screen.getByRole('region', { name: 'alertInvestigation.sections.collection' });
    expect(region).not.toHaveTextContent('alertInvestigation.collection.failureClass');
    expect(region).not.toHaveTextContent('alertInvestigation.collection.phase');
  });
});
