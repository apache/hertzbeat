/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({ loadMonitors: vi.fn(), loadAlertSummary: vi.fn(), loadEntities: vi.fn() }));
vi.mock('@/features/monitor', async original => ({
  ...(await original<typeof import('@/features/monitor')>()),
  loadMonitors: api.loadMonitors
}));
vi.mock('@/features/alert', async original => ({
  ...(await original<typeof import('@/features/alert')>()),
  loadAlertSummary: api.loadAlertSummary
}));
vi.mock('@/features/entity/queries', async original => ({
  ...(await original<typeof import('@/features/entity/queries')>()),
  loadEntities: api.loadEntities
}));

import { useDashboardActivity } from './use-dashboard-activity';

describe('Start activity evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMonitors.mockResolvedValue({ totalElements: 0 });
    api.loadEntities.mockResolvedValue({ totalElements: 0 });
    api.loadAlertSummary.mockResolvedValue({ total: 0, dealNum: 0 });
  });
  afterEach(cleanup);

  it('shows intake choices only after all three entry sources confirm no records', async () => {
    const view = renderActivity();
    expect(view.result.current.firstUse).toBe(false);
    expect(view.result.current.monitors).toEqual({ kind: 'loading' });
    await waitFor(() => expect(view.result.current.firstUse).toBe(true));
    expect(api.loadMonitors).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 0, pageSize: 10 }),
      expect.any(AbortSignal)
    );
    expect(api.loadEntities).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'service', pageIndex: 0, pageSize: 10 }),
      expect.any(AbortSignal)
    );
  });

  it('uses backend totals and distinguishes unresolved alerts from all historical alerts', async () => {
    api.loadMonitors.mockResolvedValue({ totalElements: 138 });
    api.loadEntities.mockResolvedValue({ totalElements: 27 });
    api.loadAlertSummary.mockResolvedValue({ total: 100, dealNum: 96 });
    const view = renderActivity();
    await waitFor(() => expect(view.result.current.alerts).toEqual({ kind: 'ready', count: 4 }));
    expect(view.result.current.monitors).toEqual({ kind: 'ready', count: 138 });
    expect(view.result.current.services).toEqual({ kind: 'ready', count: 27 });
    expect(view.result.current.firstUse).toBe(false);
  });

  it('keeps known history in daily mode even after every alert is resolved', async () => {
    api.loadAlertSummary.mockResolvedValue({ total: 10, dealNum: 10 });
    const view = renderActivity();
    await waitFor(() => expect(view.result.current.alerts).toEqual({ kind: 'ready', count: 0 }));
    expect(view.result.current.firstUse).toBe(false);
  });

  it('does not reinterpret denied or failed reads as absent entry records', async () => {
    api.loadMonitors.mockRejectedValue(new ApiMessageError('denied', { status: 403 }));
    api.loadEntities.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    const view = renderActivity();
    await waitFor(() => expect(view.result.current.monitors).toEqual({ kind: 'permission' }));
    expect(view.result.current.services).toEqual({ kind: 'unavailable' });
    expect(view.result.current.alerts).toEqual({ kind: 'ready', count: 0 });
    expect(view.result.current.firstUse).toBe(false);
  });

  it('clears a previously displayed count when its refresh fails', async () => {
    api.loadMonitors.mockResolvedValue({ totalElements: 7 });
    const view = renderActivity();
    await waitFor(() => expect(view.result.current.monitors).toEqual({ kind: 'ready', count: 7 }));
    api.loadMonitors.mockRejectedValue(new ApiMessageError('offline', { status: 503 }));
    await act(async () => view.result.current.refresh());
    await waitFor(() => expect(view.result.current.monitors).toEqual({ kind: 'unavailable' }));
    expect(view.result.current.firstUse).toBe(false);
  });
});

function renderActivity() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(() => useDashboardActivity(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  });
}
