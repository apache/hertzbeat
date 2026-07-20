/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import type { BulletinDraft } from '../model/bulletin-model';
import { resolveBulletinDependencies, useBulletinDependencies } from './bulletin-dependencies-controller';

const monitor = vi.hoisted(() => ({
  loadMonitorApps: vi.fn(),
  loadMonitorAppHierarchy: vi.fn(),
  loadMonitors: vi.fn()
}));
const language = vi.hoisted(() => ({ current: 'en-US' }));

vi.mock('@/features/monitor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/monitor')>()),
  loadMonitorApps: monitor.loadMonitorApps,
  loadMonitorAppHierarchy: monitor.loadMonitorAppHierarchy,
  loadMonitors: monitor.loadMonitors
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: language.current } })
}));

describe('Bulletin dependency controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    language.current = 'en-US';
    monitor.loadMonitorApps.mockResolvedValue([
      { value: 'website', label: 'Website', hide: false },
      { value: 'redis', label: 'Redis', hide: false }
    ]);
    monitor.loadMonitors.mockResolvedValue({
      content: [{ id: 1, name: 'prod', app: 'website' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50
    });
  });

  it('keeps the closed editor idle without starting dependency requests', () => {
    const hook = renderHook(() => useBulletinDependencies(null), { wrapper: createWrapper() });

    expect(hook.result.current).toMatchObject({
      kind: 'idle',
      monitorSelection: 'unverified',
      fieldSelection: 'unverified'
    });
    expect(monitor.loadMonitorApps).not.toHaveBeenCalled();
    expect(monitor.loadMonitors).not.toHaveBeenCalled();
    expect(monitor.loadMonitorAppHierarchy).not.toHaveBeenCalled();
  });

  it('loads the application catalog without treating disabled downstream queries as pending', async () => {
    const blank: BulletinDraft = { name: '', app: '', monitorIds: [], fields: {} };
    const hook = renderHook(() => useBulletinDependencies(blank), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(hook.result.current).toMatchObject({ monitorSelection: 'valid', fieldSelection: 'valid' });
    expect(monitor.loadMonitors).not.toHaveBeenCalled();
    expect(monitor.loadMonitorAppHierarchy).not.toHaveBeenCalled();
  });

  it('loads the active app hierarchy in the active locale and never presents the prior tree during a switch', async () => {
    let resolveRedis!: (value: ReturnType<typeof hierarchy>) => void;
    monitor.loadMonitorAppHierarchy.mockImplementation((app: string) =>
      app === 'website'
        ? Promise.resolve(hierarchy('website'))
        : new Promise(resolve => {
            resolveRedis = resolve;
          })
    );
    const initialProps = draft('website');
    const hook = renderHook(({ value }) => useBulletinDependencies(value), {
      initialProps: { value: initialProps },
      wrapper: createWrapper()
    });

    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(hook.result.current.metricTree).toHaveLength(1);
    expect(monitor.loadMonitorAppHierarchy).toHaveBeenCalledWith('website', 'en-US', expect.any(AbortSignal));

    hook.rerender({ value: draft('redis') });
    await waitFor(() => expect(hook.result.current.kind).toBe('loading'));
    expect(hook.result.current.metricTree).toEqual([]);
    expect(hook.result.current.fieldSelection).toBe('unverified');
    resolveRedis(hierarchy('redis'));
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(hook.result.current.metricTree[0]?.metric).toBe('summary');
  });

  it('keeps removed saved fields repairable without calling the resource invalid', async () => {
    monitor.loadMonitorAppHierarchy.mockResolvedValue(hierarchy('website'));
    const stale = { ...draft('website'), id: 7, fields: { summary: ['removed'] } };
    const hook = renderHook(() => useBulletinDependencies(stale), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(hook.result.current.fieldSelection).toBe('stale');
    expect(hook.result.current.metricTree).toHaveLength(1);
  });

  it('does not present labels from the prior locale while localized hierarchy reloads', async () => {
    let resolveChinese!: (value: ReturnType<typeof hierarchy>) => void;
    monitor.loadMonitorAppHierarchy.mockImplementation((_app: string, locale: string) =>
      locale === 'en-US'
        ? Promise.resolve(hierarchy('website'))
        : new Promise(resolve => {
            resolveChinese = resolve;
          })
    );
    const hook = renderHook(({ value }) => useBulletinDependencies(value), {
      initialProps: { value: draft('website') },
      wrapper: createWrapper()
    });

    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    language.current = 'zh-CN';
    hook.rerender({ value: { ...draft('website') } });
    await waitFor(() => expect(hook.result.current.kind).toBe('loading'));
    expect(hook.result.current.metricTree).toEqual([]);
    expect(monitor.loadMonitorAppHierarchy).toHaveBeenCalledWith('website', 'zh-CN', expect.any(AbortSignal));
    resolveChinese(hierarchy('website'));
    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
  });

  it('classifies hierarchy unavailability without exposing a metric tree', async () => {
    monitor.loadMonitorAppHierarchy.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    const hook = renderHook(() => useBulletinDependencies(draft('website')), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('unavailable'));
    expect(hook.result.current.metricTree).toEqual([]);
    expect(hook.result.current.fieldSelection).toBe('unverified');
  });

  it('blocks an edit with saved fields when the authoritative hierarchy is empty', async () => {
    monitor.loadMonitorAppHierarchy.mockResolvedValue({ ...hierarchy('website'), children: [] });
    const hook = renderHook(
      () =>
        useBulletinDependencies({
          ...draft('website'),
          id: 7
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(hook.result.current.metricTree).toEqual([]);
    expect(hook.result.current.fieldSelection).toBe('stale');
    expect(hook.result.current.monitorSelection).toBe('valid');
  });

  it('treats disabled downstream queries as intentional only while no application is selected', () => {
    const result = resolveBulletinDependencies(draft(''), {
      app: '',
      apps: success([{ value: 'website', label: 'Website', hide: false }]),
      monitors: pending(),
      hierarchy: pending()
    });

    expect(result.kind).toBe('ready');
    expect(result.monitorSelection).toBe('stale');
    expect(result.fieldSelection).toBe('stale');
  });

  it('keeps selections unverified while selected-application dependencies are pending or failed', () => {
    const editing = { ...draft('website'), id: 7 };
    const loading = resolveBulletinDependencies(editing, {
      app: 'website',
      apps: success([{ value: 'website', label: 'Website', hide: false }]),
      monitors: pending(),
      hierarchy: success([])
    });
    const unavailable = resolveBulletinDependencies(editing, {
      app: 'website',
      apps: pending(),
      monitors: failure(new ApiMessageError('offline', { status: 503 })),
      hierarchy: pending()
    });

    expect(loading).toMatchObject({ kind: 'loading', monitorSelection: 'unverified', fieldSelection: 'unverified' });
    expect(unavailable).toMatchObject({
      kind: 'unavailable',
      monitorSelection: 'unverified',
      fieldSelection: 'unverified'
    });
  });

  it('distinguishes authoritative empty data from an impossible successful undefined result', () => {
    const editing = { ...draft('website'), id: 7 };
    const empty = resolveBulletinDependencies(editing, {
      app: 'website',
      apps: success([{ value: 'website', label: 'Website', hide: false }]),
      monitors: success([]),
      hierarchy: success([])
    });
    const undefinedMonitors = resolveBulletinDependencies(editing, {
      app: 'website',
      apps: success([{ value: 'website', label: 'Website', hide: false }]),
      monitors: success(undefined),
      hierarchy: success([])
    });

    expect(empty).toMatchObject({ kind: 'ready', monitorSelection: 'stale', fieldSelection: 'stale' });
    expect(undefinedMonitors).toMatchObject({
      kind: 'invalid',
      monitorSelection: 'unverified',
      fieldSelection: 'unverified'
    });
  });

  it('does not validate saved selections against cached data during an active refresh', () => {
    const editing = { ...draft('website'), id: 7 };
    const result = resolveBulletinDependencies(editing, {
      app: 'website',
      apps: success([{ value: 'website', label: 'Website', hide: false }]),
      monitors: refreshing([{ id: 1, name: 'prod', app: 'website', instance: 'prod', status: 1 }]),
      hierarchy: success([])
    });

    expect(result).toMatchObject({
      kind: 'loading',
      monitorSelection: 'unverified',
      fieldSelection: 'unverified',
      monitors: [],
      metricTree: []
    });
  });

  it.each([
    ['total pages drift', secondMonitorPage({ totalPages: 3 })],
    ['total elements drift', secondMonitorPage({ totalElements: 52, content: monitorRecords(51, 2) })],
    ['page size drift', secondMonitorPage({ size: 20 })],
    ['page number mismatch', secondMonitorPage({ number: 0 })],
    ['partial page content', secondMonitorPage({ content: [] })],
    ['duplicate id across pages', secondMonitorPage({ content: monitorRecords(1, 1) })]
  ])('surfaces invalid dependency evidence for %s', async (_label, secondPage) => {
    monitor.loadMonitorAppHierarchy.mockResolvedValue(hierarchy('website'));
    monitor.loadMonitors.mockImplementation(({ pageIndex }: { pageIndex: number }) =>
      Promise.resolve(pageIndex === 0 ? firstMonitorPage() : secondPage)
    );
    const hook = renderHook(() => useBulletinDependencies(draft('website')), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('invalid'));
    expect(hook.result.current.monitorSelection).toBe('unverified');
    expect(hook.result.current.monitors).toEqual([]);
  });

  it('rejects duplicate monitor identities within one page', async () => {
    monitor.loadMonitorAppHierarchy.mockResolvedValue(hierarchy('website'));
    monitor.loadMonitors.mockResolvedValue({
      content: [monitorRecord(1), monitorRecord(1)],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 50
    });
    const hook = renderHook(() => useBulletinDependencies(draft('website')), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('invalid'));
    expect(hook.result.current.monitorSelection).toBe('unverified');
  });

  it('keeps scans beyond the monitor proof safety bound invalid', async () => {
    monitor.loadMonitorAppHierarchy.mockResolvedValue(hierarchy('website'));
    monitor.loadMonitors.mockResolvedValue({
      content: monitorRecords(1, 50),
      totalElements: 1_050,
      totalPages: 21,
      number: 0,
      size: 50
    });
    const hook = renderHook(() => useBulletinDependencies(draft('website')), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('invalid'));
    expect(hook.result.current.monitorSelection).toBe('unverified');
  });

  it('validates a stable multi-page scan while preserving cancellation and named policy inputs', async () => {
    monitor.loadMonitorAppHierarchy.mockResolvedValue(hierarchy('website'));
    monitor.loadMonitors.mockImplementation(({ pageIndex }: { pageIndex: number }) =>
      Promise.resolve(pageIndex === 0 ? firstMonitorPage() : secondMonitorPage({}))
    );
    const hook = renderHook(() => useBulletinDependencies(draft('website')), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current.kind).toBe('ready'));
    expect(hook.result.current.monitorSelection).toBe('valid');
    expect(hook.result.current.monitors).toHaveLength(51);
    expect(monitor.loadMonitors).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pageIndex: 0, pageSize: 50, status: '9' }),
      expect.any(AbortSignal)
    );
    expect(monitor.loadMonitors).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pageIndex: 1, pageSize: 50, status: '9' }),
      expect.any(AbortSignal)
    );
    expect(monitor.loadMonitors.mock.calls[0]?.[1]).toBe(monitor.loadMonitors.mock.calls[1]?.[1]);
  });
});

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function draft(app: string): BulletinDraft {
  return { name: 'Ops', app, monitorIds: [1], fields: { summary: ['status'] } };
}

function hierarchy(app: string) {
  return {
    category: 'network',
    value: app,
    label: app,
    isLeaf: false as const,
    hide: false,
    type: null,
    unit: null,
    children: [
      {
        category: null,
        value: 'summary',
        label: 'Summary',
        isLeaf: false as const,
        hide: null,
        type: null,
        unit: null,
        children: [
          {
            category: null,
            value: 'status',
            label: 'Status',
            isLeaf: true as const,
            hide: null,
            type: 0,
            unit: null,
            children: []
          }
        ]
      }
    ]
  };
}

function pending() {
  return { status: 'pending' as const, fetchStatus: 'fetching' as const, data: undefined, error: null };
}

function success<T>(data: T | undefined) {
  return { status: 'success' as const, fetchStatus: 'idle' as const, data, error: null };
}

function refreshing<T>(data: T) {
  return { status: 'success' as const, fetchStatus: 'fetching' as const, data, error: null };
}

function failure(error: unknown) {
  return { status: 'error' as const, fetchStatus: 'idle' as const, data: undefined, error };
}

function monitorRecord(id: number) {
  return { id, name: `monitor-${id}`, app: 'website', instance: `instance-${id}`, status: 1 };
}

function monitorRecords(firstId: number, count: number) {
  return Array.from({ length: count }, (_value, index) => monitorRecord(firstId + index));
}

function firstMonitorPage() {
  return {
    content: monitorRecords(1, 50),
    totalElements: 51,
    totalPages: 2,
    number: 0,
    size: 50
  };
}

function secondMonitorPage(patch: Partial<ReturnType<typeof firstMonitorPage>>): ReturnType<typeof firstMonitorPage> {
  return {
    content: monitorRecords(51, 1),
    totalElements: 51,
    totalPages: 2,
    number: 1,
    size: 50,
    ...patch
  };
}
