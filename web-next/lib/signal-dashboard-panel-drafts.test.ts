import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySignalDashboardPanelEditContext,
  buildSignalDashboardPanelDraftKey,
  createSignalDashboardPanelDraft,
  deleteSignalDashboardPanelDraft,
  duplicateSignalDashboardPanelDraft,
  loadAllSignalDashboardPanelDrafts,
  loadSignalDashboardPanelDrafts,
  saveSignalDashboardPanelDraft
} from './signal-dashboard-panel-drafts';

describe('signal dashboard panel drafts API client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T10:00:00Z'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('builds stable panel draft keys from signal route and visualization', () => {
    const route = '/trace/manage?serviceName=checkout&view=time-series';

    expect(buildSignalDashboardPanelDraftKey('traces', route, 'time-series'))
      .toBe(buildSignalDashboardPanelDraftKey('traces', route, 'time-series'));
    expect(buildSignalDashboardPanelDraftKey('traces', route, 'time-series'))
      .toMatch(/^traces-panel-[a-z0-9]+$/);
  });

  it('creates dashboard panel drafts with route snapshots and metadata payload', () => {
    const draft = createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: 'Checkout p95',
      description: 'Latency panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration',
      payload: { source: 'metrics-explorer' }
    });

    expect(draft).toEqual(expect.objectContaining({
      signal: 'metrics',
      title: 'Checkout p95',
      visualization: 'graph',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration'
    }));
    expect(JSON.parse(String(draft.payload))).toEqual({
      createdAt: new Date('2026-06-06T10:00:00Z').getTime(),
      source: 'metrics-explorer'
    });
  });

  it('applies dashboard panel edit context by preserving the source draft identity', () => {
    const draft = createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: 'Checkout p95',
      description: 'Latency panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration',
      payload: { source: 'metrics-explorer' }
    });

    const editedDraft = applySignalDashboardPanelEditContext(draft, {
      intent: 'edit-panel',
      dashboardKey: 'signals-overview',
      panelId: 'metrics-panel-1',
      draftKey: 'metrics-panel-checkout',
      returnTo: '/dashboard?start=10',
      returnLabel: 'Signals overview'
    });

    expect(editedDraft.draftKey).toBe('metrics-panel-checkout');
    expect(editedDraft.querySnapshot).toBe('/ingestion/otlp/metrics?query=http.server.duration');
    expect(JSON.parse(String(editedDraft.payload))).toEqual({
      createdAt: new Date('2026-06-06T10:00:00Z').getTime(),
      source: 'metrics-explorer',
      dashboardPanelEdit: {
        intent: 'edit-panel',
        dashboardKey: 'signals-overview',
        panelId: 'metrics-panel-1',
        draftKey: 'metrics-panel-checkout',
        returnTo: '/dashboard?start=10',
        returnLabel: 'Signals overview'
      }
    });
  });

  it('duplicates dashboard panel drafts while preserving source context', () => {
    const draft = createSignalDashboardPanelDraft({
      signal: 'metrics',
      title: 'Checkout p95',
      description: 'Latency panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration',
      payload: {
        source: 'signal-saved-view',
        savedViewId: 'metrics-checkout-p95',
        savedViewRouteSummaryText: 'query=http.server.duration'
      }
    });

    vi.setSystemTime(new Date('2026-06-06T10:05:00Z'));
    const duplicate = duplicateSignalDashboardPanelDraft(draft, {
      titleSuffix: 'Copy',
      draftKeySuffix: 'copy-test'
    });

    expect(duplicate).toEqual(expect.objectContaining({
      id: undefined,
      createTime: undefined,
      updateTime: undefined,
      signal: 'metrics',
      title: 'Checkout p95 Copy',
      description: 'Latency panel',
      visualization: 'graph',
      route: '/ingestion/otlp/metrics?query=http.server.duration',
      querySnapshot: '/ingestion/otlp/metrics?query=http.server.duration'
    }));
    expect(duplicate.draftKey).toBe(`${draft.draftKey}-copy-test`);
    expect(JSON.parse(String(duplicate.payload))).toEqual({
      createdAt: new Date('2026-06-06T10:00:00Z').getTime(),
      source: 'signal-dashboard-panel-duplicate',
      savedViewId: 'metrics-checkout-p95',
      savedViewRouteSummaryText: 'query=http.server.duration',
      duplicatedFromSource: 'signal-saved-view',
      duplicatedFromDraftKey: draft.draftKey,
      duplicatedAt: new Date('2026-06-06T10:05:00Z').getTime()
    });
  });

  it('upserts dashboard panel drafts through the backend message API', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: {
        id: 7,
        signal: 'logs',
        draftKey: 'logs-panel-errors',
        title: 'Error logs',
        description: 'Error table',
        visualization: 'table',
        route: '/log/manage?severityText=ERROR&view=table'
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(saveSignalDashboardPanelDraft({
      signal: 'logs',
      draftKey: 'logs-panel-errors',
      title: 'Error logs',
      description: 'Error table',
      visualization: 'table',
      route: '/log/manage?severityText=ERROR&view=table',
      querySnapshot: '/log/manage?severityText=ERROR&view=table'
    })).resolves.toEqual(expect.objectContaining({
      id: 7,
      draftKey: 'logs-panel-errors'
    }));

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/dashboard-panel-draft', expect.objectContaining({
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });

  it('loads signal panel drafts through the backend message API', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: [
        {
          id: 7,
          signal: 'traces',
          draftKey: 'traces-panel-latency',
          title: 'Checkout latency',
          description: 'Trace latency panel',
          visualization: 'trace',
          route: '/trace/manage?serviceName=checkout'
        }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(loadSignalDashboardPanelDrafts('traces')).resolves.toEqual([
      expect.objectContaining({
        signal: 'traces',
        draftKey: 'traces-panel-latency'
      })
    ]);

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/dashboard-panel-draft/traces', expect.objectContaining({
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });

  it('loads all signal panel drafts in signal order', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const signal = String(input).split('/').pop();
      return new Response(JSON.stringify({
        code: 0,
        data: [
          {
            signal,
            draftKey: `${signal}-panel`,
            title: `${signal} panel`,
            description: '',
            visualization: signal === 'metrics' ? 'graph' : 'list',
            route: signal === 'metrics' ? '/ingestion/otlp/metrics' : `/${signal === 'logs' ? 'log' : 'trace'}/manage`
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await expect(loadAllSignalDashboardPanelDrafts()).resolves.toEqual([
      expect.objectContaining({ signal: 'logs' }),
      expect.objectContaining({ signal: 'traces' }),
      expect.objectContaining({ signal: 'metrics' })
    ]);
  });

  it('deletes signal panel drafts through the backend message API', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      data: null
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    await expect(deleteSignalDashboardPanelDraft('metrics', 'metrics-panel-1')).resolves.toBeUndefined();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/signal/dashboard-panel-draft/metrics/metrics-panel-1', expect.objectContaining({
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store'
    }));
  });
});
