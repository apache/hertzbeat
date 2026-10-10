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
import { createSignalCapabilities } from '@/features/investigation';
import type { EntitySignalViewState } from '../model/entity-signal-view-model';
import { EntityDetailView } from './entity-detail-view';

const entity = {
  id: 7,
  type: 'service',
  name: 'checkout',
  environment: 'prod',
  source: 'manual',
  labels: { region: 'east' },
  tags: ['critical']
};

describe('EntityDetailView', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });
  afterEach(cleanup);

  it.each(['loading', 'missing', 'permission', 'unavailable', 'error'] as const)(
    'keeps %s distinct from ready detail',
    kind => {
      renderView({ kind });
      expect(screen.queryByRole('heading', { name: 'checkout' })).not.toBeInTheDocument();
      expect(document.querySelector('[data-hb-operational-page]')).toBeInTheDocument();
      expect(document.querySelector('.ant-empty-image')).not.toBeInTheDocument();
    }
  );

  it('places authoritative resource context beside the title and focuses the existing status explanation', () => {
    renderView({
      kind: 'ready',
      detail: {
        entity: { ...entity, status: 'healthy' },
        status: { status: 'unknown', reason: 'No bound live evidence' },
        identities: [],
        monitorPreview: { items: [], total: 0, complete: true },
        relations: []
      }
    });
    const header = screen.getByRole('heading', { name: 'checkout' }).closest('header')!;
    expect(within(header).getByText('prod')).toBeInTheDocument();
    expect(
      within(header).getByText(`${i18n.t('entity.fields.source')}: ${i18n.t('entity.values.source.manual')}`)
    ).toBeInTheDocument();
    const status = within(header).getByRole('button', {
      name: `${i18n.t('entity.fields.status')}: ${i18n.t('entity.values.status.unknown')}`
    });
    expect(within(header).queryByText(i18n.t('entity.values.status.healthy'))).not.toBeInTheDocument();
    fireEvent.click(status);
    expect(screen.getByText('No bound live evidence')).toHaveFocus();
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).not.toHaveClass('ant-btn-primary');
  });

  it('keeps degraded telemetry from turning a persisted resource status into live health', () => {
    renderView({ kind: 'degraded', entity: { ...entity, status: 'healthy' }, unavailable: 'telemetry' });
    const header = screen.getByRole('heading', { name: 'checkout' }).closest('header')!;
    expect(
      within(header).getByText(`${i18n.t('entity.fields.status')}: ${i18n.t('entity.values.status.unknown')}`)
    ).toBeInTheDocument();
    expect(within(header).queryByText(i18n.t('entity.values.status.healthy'))).not.toBeInTheDocument();
    expect(screen.getByText(i18n.t('entity.degraded.description'))).toBeInTheDocument();
  });

  it('navigates only existing chapters without remounting the monitor draft or changing the URL', async () => {
    const scroll = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    renderView({
      kind: 'ready',
      detail: { entity, identities: [], monitorPreview: { items: [], total: 0, complete: true }, relations: [] }
    });
    const nav = await screen.findByRole('navigation', { name: i18n.t('entity.sections.details') });
    expect(within(nav).queryByRole('button', { name: i18n.t('entity.operations.title') })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: i18n.t('entity.noiseControls.title') })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: i18n.t('entity.signals.title') })).not.toBeInTheDocument();
    const draft = screen.getByRole('searchbox', { name: i18n.t('entity.monitors.app') });
    fireEvent.change(draft, { target: { value: 'unsent-monitor-type' } });
    const before = location.href;
    fireEvent.click(within(nav).getByRole('button', { name: i18n.t('entity.sections.monitors') }));
    expect(within(nav).getByRole('button', { name: i18n.t('entity.sections.monitors') })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(document.getElementById('entity-monitors')).toHaveFocus();
    fireEvent.click(within(nav).getByRole('button', { name: i18n.t('entity.sections.relations') }));
    expect(document.getElementById('entity-relations')).toHaveFocus();
    expect(draft).toHaveValue('unsent-monitor-type');
    expect(location.href).toBe(before);
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it('shows real identity, health, monitor, and relation evidence', () => {
    renderView({
      kind: 'ready',
      detail: {
        entity,
        identities: [{ identityType: 'derived', identityKey: 'service.name', identityValue: 'checkout' }],
        status: { status: 'degraded', reason: 'monitor down' },
        evidence: { logHintCount: 1 },
        monitorPreview: {
          items: [{ id: 3, name: 'checkout-http', app: 'website', status: 2 }],
          total: 1,
          complete: true
        },
        relations: [{ entityName: 'payments', relationType: 'depends_on', direction: 'outgoing' }]
      }
    });
    expect(screen.getByText('service.name')).toBeInTheDocument();
    expect(screen.getByText('checkout-http')).toBeInTheDocument();
    expect(screen.getByText('depends_on')).toBeInTheDocument();
    expect(screen.getByText('monitor down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Definition' })).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Automatically recognized')).toBeInTheDocument();
    expect(screen.getByText('Outgoing')).toBeInTheDocument();
    expect(screen.queryByText(/service · 7/)).not.toBeInTheDocument();
  });

  it('keeps source-backed identity actionable without inventing unavailable telemetry evidence', () => {
    const topology = vi.fn();
    renderView(
      { kind: 'degraded', entity: { ...entity, owner: 'payments-sre' }, unavailable: 'telemetry' },
      { topology }
    );

    expect(screen.getByRole('heading', { name: 'checkout' })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('entity.degraded.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('entity.degraded.description'))).toBeInTheDocument();
    expect(screen.getByText('payments-sre')).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('entity.values.status.healthy'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('entity.missing.evidence'))).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('entity.topology.view') })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeEnabled();
    expect(topology).not.toHaveBeenCalled();
  });

  it('renders independent signal investigation beside degraded legacy evidence with unknown bindings', () => {
    renderView(
      { kind: 'degraded', entity: { ...entity, owner: 'payments-sre' }, unavailable: 'telemetry' },
      { signals: degradedSignals() }
    );

    expect(screen.getByText(i18n.t('entity.degraded.title'))).toBeInTheDocument();
    expect(screen.getByText('payments-sre')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: i18n.t('entity.signals.title') })).toBeInTheDocument();
    const bindings = screen.getByRole('region', { name: i18n.t('entity.signals.boundMonitors') });
    expect(within(bindings).getByText('Monitor binding evidence is unavailable.')).toBeInTheDocument();
    expect(within(bindings).queryByText('No bound monitors.')).not.toBeInTheDocument();
  });

  it('offers only evidence-backed Explore handoffs', () => {
    const explore = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          evidence: { logHintCount: 1 },
          monitorPreview: { items: [], total: 0, complete: true },
          relations: []
        }
      },
      { explore }
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.explore.logs') }));
    expect(explore).toHaveBeenCalledWith('logs');
    expect(screen.queryByRole('button', { name: i18n.t('entity.explore.metrics') })).not.toBeInTheDocument();
  });

  it('keeps a monitor-backed Metrics handoff visible when exact-window RED is empty', () => {
    const explore = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: {
          entity: { ...entity, type: 'host' },
          identities: [],
          monitorPreview: {
            items: [{ id: 3, name: 'host-ping', app: 'ping', instance: '10.0.0.7' }],
            total: 1,
            complete: true
          },
          relations: []
        }
      },
      { explore, signals: unknownMetricSignals() }
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.explore.metrics') }));
    expect(explore).toHaveBeenCalledWith('metrics');
  });

  it('offers topology inspection for every ready entity in a read-only session', () => {
    const topology = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          monitorPreview: { items: [], total: 0, complete: true },
          relations: []
        }
      },
      { canWrite: false, canDelete: false, topology }
    );

    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.topology.view') }));
    expect(topology).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: i18n.t('common.edit') })).not.toBeInTheDocument();
  });

  it('renders backend-recommended operations and delegates only their stable action code', () => {
    const nextAction = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          monitorPreview: { items: [], total: 0, complete: true },
          opsSummary: {
            ownerReady: true,
            runbookReady: false,
            relationReady: true,
            telemetryReady: true,
            statusReady: true,
            readinessScore: 80,
            relationCount: 1
          },
          nextActions: [
            {
              actionType: 'complete_runbook',
              title: 'Server-localized runbook title',
              summary: 'Server-localized runbook summary',
              actionLabel: 'Server-localized runbook action',
              priority: 80
            }
          ],
          responseHandoffs: { editor: { focus: 'ownership' } },
          relations: []
        }
      },
      { nextAction }
    );

    const region = screen.getByRole('region', { name: i18n.t('entity.operations.title') });
    expect(within(region).getByText(i18n.t('entity.operations.actions.complete_runbook.title'))).toBeInTheDocument();
    expect(within(region).getByText(i18n.t('entity.operations.actions.complete_runbook.summary'))).toBeInTheDocument();
    expect(within(region).queryByText('Server-localized runbook title')).not.toBeInTheDocument();
    fireEvent.click(
      within(region).getByRole('button', { name: i18n.t('entity.operations.actions.complete_runbook.action') })
    );
    expect(nextAction).toHaveBeenCalledWith('complete_runbook');
  });

  it('keeps write recommendations out of a read-only session without hiding read guidance', () => {
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          monitorPreview: { items: [], total: 0, complete: true },
          nextActions: [
            {
              actionType: 'complete_runbook',
              title: 'Add a runbook',
              summary: 'Responders need a documented procedure.',
              actionLabel: 'Edit ownership',
              priority: 80
            },
            {
              actionType: 'inspect_logs',
              title: 'Inspect logs',
              summary: 'A safe log handoff is available.',
              actionLabel: 'Open logs',
              priority: 60
            }
          ],
          relations: []
        }
      },
      { canWrite: false }
    );

    expect(
      screen.queryByRole('button', { name: i18n.t('entity.operations.actions.complete_runbook.action') })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: i18n.t('entity.operations.actions.inspect_logs.action') })
    ).toBeInTheDocument();
  });

  it('renders compact real evidence and metadata while preserving numeric zero', () => {
    renderView({
      kind: 'ready',
      detail: {
        entity,
        identities: [],
        evidence: {
          activeAlertCount: 0,
          downMonitorCount: 0,
          healthyMonitorCount: 2,
          identityCount: 1,
          logHintCount: 0
        },
        monitorPreview: { items: [], total: 0, complete: true },
        relations: []
      }
    });
    const evidence = screen.getByRole('region', { name: i18n.t('entity.sections.evidence') });
    expect(within(evidence).getAllByText('0')).toHaveLength(3);
    expect(within(evidence).getByText('2')).toBeInTheDocument();
    expect(within(evidence).getByText('Recognition evidence count')).toBeInTheDocument();
    expect(within(evidence).getByText('Log query hints')).toBeInTheDocument();
    expect(screen.getByText('region=east')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('labels absent evidence as missing instead of turning it into zeros', () => {
    renderView({
      kind: 'ready',
      detail: { entity, identities: [], monitorPreview: { items: [], total: 0, complete: true }, relations: [] }
    });
    const evidence = screen.getByRole('region', { name: i18n.t('entity.sections.evidence') });
    expect(within(evidence).getByText(i18n.t('entity.missing.evidence'))).toBeInTheDocument();
    expect(within(evidence).queryByText('0')).not.toBeInTheDocument();
  });

  it('keeps active-monitoring and application-telemetry evidence visibly separate', () => {
    renderView({
      kind: 'ready',
      detail: {
        entity,
        identities: [],
        monitorPreview: { items: [], total: 0, complete: true },
        unifiedEvidence: {
          activeSignalCount: 3,
          activeSignals: ['metrics', 'logs', 'traces'],
          active: { metrics: true, logs: true, traces: true },
          totals: { metrics: 8, logs: 4, traces: 2 },
          lastObservedAt: 2_000,
          sources: [
            { source: 'otlp', metrics: 2, logs: 4, traces: 2, lastObservedAt: 2_000 },
            { source: 'monitor', metrics: 6, logs: 0, traces: 0, lastObservedAt: 1_000 }
          ]
        },
        relations: []
      }
    });

    const sources = screen.getByRole('table', { name: i18n.t('entity.evidence.sources.title') });
    const rows = within(sources).getAllByRole('row');
    expect(within(rows[1]!).getByText(i18n.t('entity.evidence.sources.monitor'))).toBeInTheDocument();
    expect(within(rows[1]!).getByText('6')).toBeInTheDocument();
    expect(within(rows[2]!).getByText(i18n.t('entity.evidence.sources.otlp'))).toBeInTheDocument();
    expect(within(rows[2]!).getByText('4')).toBeInTheDocument();
    expect(within(sources).getByText(formatEvidenceTime(1_000))).toBeInTheDocument();
    expect(within(sources).getByText(formatEvidenceTime(2_000))).toBeInTheDocument();
  });

  it('does not turn unavailable or empty source provenance into zero-count rows', () => {
    const view = renderView({
      kind: 'ready',
      detail: { entity, identities: [], monitorPreview: { items: [], total: 0, complete: true }, relations: [] }
    });
    expect(screen.getByText(i18n.t('entity.evidence.sources.unavailable'))).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: i18n.t('entity.evidence.sources.title') })).queryByRole('table')
    ).not.toBeInTheDocument();

    view.unmount();
    renderView({
      kind: 'ready',
      detail: {
        entity,
        identities: [],
        monitorPreview: { items: [], total: 0, complete: true },
        unifiedEvidence: {
          activeSignalCount: 0,
          activeSignals: [],
          active: { metrics: false, logs: false, traces: false },
          totals: { metrics: 0, logs: 0, traces: 0 },
          sources: []
        },
        relations: []
      }
    });
    expect(screen.getByText(i18n.t('entity.evidence.sources.empty'))).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders matching silence and inhibit evidence without inventing rules', () => {
    const manageNoiseControls = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          noiseControls: {
            activeSilenceCount: 1,
            matchingInhibitCount: 1,
            activeSilences: [
              {
                id: 31,
                name: 'Checkout maintenance',
                type: 'silence',
                global: false,
                matchedLabels: ['service.name']
              }
            ],
            matchingInhibits: [
              {
                id: 41,
                name: 'Critical suppresses warning',
                type: 'inhibit',
                global: false,
                matchedLabels: ['environment']
              }
            ],
            possibleAlertSuppression: true
          },
          monitorPreview: { items: [], total: 0, complete: true },
          relations: []
        }
      },
      { manageNoiseControls }
    );

    const section = screen.getByRole('region', { name: i18n.t('entity.noiseControls.title') });
    expect(within(section).getByText('Checkout maintenance')).toBeInTheDocument();
    expect(within(section).getByText('Critical suppresses warning')).toBeInTheDocument();
    expect(within(section).getByText(i18n.t('entity.noiseControls.possibleSuppression'))).toBeInTheDocument();
    expect(within(section).queryByText('0')).not.toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: i18n.t('entity.noiseControls.manageSilences') }));
    fireEvent.click(within(section).getByRole('button', { name: i18n.t('entity.noiseControls.manageInhibits') }));
    expect(manageNoiseControls).toHaveBeenNthCalledWith(1, 'silence');
    expect(manageNoiseControls).toHaveBeenNthCalledWith(2, 'inhibit');
  });

  it('offers resource deletion and renders only localized redacted failures', () => {
    const remove = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: { entity, identities: [], monitorPreview: { items: [], total: 0, complete: true }, relations: [] }
      },
      { remove, deleteFailure: 'permission' }
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entity.delete.action') }));
    expect(remove).toHaveBeenCalledOnce();
    expect(screen.getByText(i18n.t('entity.delete.failure.permission'))).toBeInTheDocument();
    expect(i18n.t('entity.delete.description')).toContain(
      'recognition evidence, monitor associations, and relationships'
    );
    expect(i18n.t('entity.delete.description')).toContain('does not delete monitored targets or telemetry data');
  });

  it('hides deletion without permission and exposes explicit refresh', () => {
    const refresh = vi.fn();
    renderView(
      {
        kind: 'ready',
        detail: { entity, identities: [], monitorPreview: { items: [], total: 0, complete: true }, relations: [] }
      },
      { canDelete: false, refresh }
    );

    expect(screen.queryByRole('button', { name: i18n.t('entity.delete.action') })).not.toBeInTheDocument();
    const header = screen.getByRole('heading', { name: 'checkout' }).closest('header');
    fireEvent.click(within(header!).getByRole('button', { name: i18n.t('common.refresh') }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('hides edit and definition entry points without write permission', () => {
    renderView(
      {
        kind: 'ready',
        detail: { entity, identities: [], monitorPreview: { items: [], total: 0, complete: true }, relations: [] }
      },
      { canDelete: false, canWrite: false }
    );

    expect(screen.queryByRole('button', { name: i18n.t('common.edit') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('entity.definition.action') })).not.toBeInTheDocument();
  });

  it('renders authoritative monitor ranges and pages without using the bind-order preview', () => {
    const changeMonitorPage = vi.fn();
    const records = Array.from({ length: 50 }, (_, index) => ({
      id: index + 100,
      name: `monitor-${index}`,
      app: 'website'
    }));
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          monitorPreview: { items: [{ id: 3, name: 'preview-only', app: 'legacy' }], total: 75, complete: false },
          relations: []
        }
      },
      {
        monitors: {
          query: { pageIndex: 0, pageSize: 50 },
          evidence: { kind: 'ready', records, total: 75 },
          refreshing: false
        },
        changeMonitorPage
      }
    );

    expect(screen.getByText('1–50/75')).toBeInTheDocument();
    expect(screen.queryByText('preview-only')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('2'));
    expect(changeMonitorPage).toHaveBeenCalledWith(1);
  });

  it('renders the final operational monitor range from page identity and total', () => {
    const records = Array.from({ length: 25 }, (_, index) => ({
      id: index + 150,
      name: `monitor-${index + 50}`,
      app: 'website'
    }));
    renderView(
      {
        kind: 'ready',
        detail: {
          entity,
          identities: [],
          monitorPreview: { items: [], total: 75, complete: false },
          relations: []
        }
      },
      {
        monitors: {
          query: { pageIndex: 1, pageSize: 50 },
          evidence: { kind: 'ready', records, total: 75 },
          refreshing: false
        }
      }
    );
    expect(screen.getByText('51–75/75')).toBeInTheDocument();
  });

  it.each(['permission', 'unavailable', 'error'] as const)(
    'keeps detail visible when only monitor loading ends in %s',
    kind => {
      renderView(
        {
          kind: 'ready',
          detail: {
            entity,
            identities: [],
            monitorPreview: { items: [], total: 0, complete: true },
            relations: []
          }
        },
        {
          monitors: {
            query: { pageIndex: 0, pageSize: 50 },
            evidence: { kind },
            refreshing: false
          }
        }
      );
      expect(screen.getByRole('heading', { name: 'checkout' })).toBeInTheDocument();
      expect(screen.queryByText(i18n.t('entity.missing.monitors'))).not.toBeInTheDocument();
    }
  );
});

function formatEvidenceTime(value: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}

type RenderViewOptions = {
  explore?: Parameters<typeof EntityDetailView>[0]['actions']['explore'];
  remove?: () => void;
  deleting?: boolean;
  deleteFailure?: 'permission' | 'validation' | 'unavailable' | 'error';
  manageNoiseControls?: Parameters<typeof EntityDetailView>[0]['actions']['manageNoiseControls'];
  canDelete?: boolean;
  refresh?: () => void;
  canWrite?: boolean;
  monitors?: Parameters<typeof EntityDetailView>[0]['state']['monitors'];
  changeMonitorPage?: Parameters<typeof EntityDetailView>[0]['actions']['changeMonitorPage'];
  nextAction?: Parameters<typeof EntityDetailView>[0]['actions']['nextAction'];
  topology?: Parameters<typeof EntityDetailView>[0]['actions']['topology'];
  signals?: EntitySignalViewState;
};

function renderView(
  evidence: Parameters<typeof EntityDetailView>[0]['state']['evidence'],
  options: RenderViewOptions = {}
) {
  return renderResolvedView(evidence, {
    explore: options.explore ?? (() => undefined),
    remove: options.remove ?? (() => undefined),
    deleting: options.deleting ?? false,
    deleteFailure: options.deleteFailure,
    manageNoiseControls: options.manageNoiseControls ?? (() => undefined),
    canDelete: options.canDelete ?? true,
    refresh: options.refresh ?? (() => undefined),
    canWrite: options.canWrite ?? true,
    monitors: options.monitors,
    changeMonitorPage: options.changeMonitorPage ?? (() => undefined),
    nextAction: options.nextAction ?? (() => undefined),
    topology: options.topology ?? (() => undefined),
    signals: options.signals
  });
}

function renderResolvedView(
  evidence: Parameters<typeof EntityDetailView>[0]['state']['evidence'],
  {
    explore,
    remove,
    deleting,
    deleteFailure,
    manageNoiseControls,
    canDelete,
    refresh,
    canWrite,
    monitors,
    changeMonitorPage,
    nextAction,
    topology,
    signals
  }: {
    explore: NonNullable<RenderViewOptions['explore']>;
    remove: NonNullable<RenderViewOptions['remove']>;
    deleting: boolean;
    deleteFailure: RenderViewOptions['deleteFailure'];
    manageNoiseControls: NonNullable<RenderViewOptions['manageNoiseControls']>;
    canDelete: boolean;
    refresh: NonNullable<RenderViewOptions['refresh']>;
    canWrite: boolean;
    monitors: RenderViewOptions['monitors'];
    changeMonitorPage: NonNullable<RenderViewOptions['changeMonitorPage']>;
    nextAction: NonNullable<RenderViewOptions['nextAction']>;
    topology: NonNullable<RenderViewOptions['topology']>;
    signals: RenderViewOptions['signals'];
  }
) {
  const records = evidence.kind === 'ready' ? evidence.detail.monitorPreview.items : [];
  const monitorState =
    monitors ??
    ({
      query: { pageIndex: 0, pageSize: 50 },
      evidence: records.length > 0 ? { kind: 'ready', records, total: records.length } : { kind: 'empty' },
      refreshing: false
    } as const);
  return render(
    <I18nextProvider i18n={i18n}>
      <EntityDetailView
        state={{
          evidence,
          deleting,
          refreshing: false,
          canWrite,
          canDelete,
          monitors: monitorState,
          ...(signals ? { signals } : {}),
          ...(deleteFailure ? { deleteFailure } : {})
        }}
        actions={{
          back: () => undefined,
          edit: () => undefined,
          definition: () => undefined,
          explore,
          refresh,
          remove,
          manageNoiseControls,
          changeMonitorPage,
          changeMonitorFilters: () => undefined,
          refreshMonitors: () => undefined,
          nextAction,
          topology
        }}
      />
    </I18nextProvider>
  );
}

function unknownMetricSignals(): Extract<EntitySignalViewState, { kind: 'ready' }> {
  const window = { from: 1_750_000_000_000, to: 1_750_000_060_000 };
  return {
    kind: 'ready',
    plan: {
      anchor: { source: 'entity', context: { entityId: '7' }, window: { ...window, timeZone: 'UTC' } },
      logsQuery: { signal: 'logs', queryKind: 'table', timeWindow: window, context: { entityId: '7' } },
      tracesQuery: { signal: 'traces', queryKind: 'table', timeWindow: window, context: { entityId: '7' } }
    },
    capabilities: createSignalCapabilities({ metrics: 'unknown', redMetrics: 'empty' }),
    red: { state: 'empty' },
    evidence: [],
    boundMonitors: { state: 'known', total: 1, names: ['host-ping'] },
    topology: { names: [] },
    alerts: {}
  };
}

function degradedSignals(): Extract<EntitySignalViewState, { kind: 'ready' }> {
  return {
    ...unknownMetricSignals(),
    boundMonitors: { state: 'unknown' },
    topology: { names: [] },
    alerts: {}
  };
}
