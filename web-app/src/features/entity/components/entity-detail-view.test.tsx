/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
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
    }
  );

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
    changeMonitorPage: options.changeMonitorPage ?? (() => undefined)
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
    changeMonitorPage
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
          refreshMonitors: () => undefined
        }}
      />
    </I18nextProvider>
  );
}
