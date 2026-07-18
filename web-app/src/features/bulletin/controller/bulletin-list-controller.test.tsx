/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { useBulletinListController } from './bulletin-list-controller';

const api = vi.hoisted(() => ({ loadBulletins: vi.fn() }));

vi.mock('../api/bulletin-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/bulletin-api')>(),
  loadBulletins: api.loadBulletins
}));

const query = { search: 'ops', pageIndex: 0, pageSize: 8 };
const oldRecord = bulletin(7, 'Old');
const freshRecord = bulletin(8, 'Fresh');

describe('Bulletin list controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides stale records after refresh failure and restores authoritative retry data', async () => {
    api.loadBulletins
      .mockResolvedValueOnce(page([oldRecord]))
      .mockRejectedValueOnce(new ApiMessageError('store unavailable', { status: 503 }))
      .mockResolvedValueOnce(page([freshRecord]));
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(hook.result.current.state).toMatchObject({ kind: 'ready', records: [oldRecord] });
    });
    await act(async () => {
      await expect(hook.result.current.refresh()).resolves.toBe(false);
    });
    await waitFor(() => {
      expect(hook.result.current.state).toEqual({ kind: 'unavailable' });
    });

    await act(async () => {
      await expect(hook.result.current.refresh()).resolves.toBe(true);
    });
    await waitFor(() => {
      expect(hook.result.current.state).toMatchObject({ kind: 'ready', records: [freshRecord] });
    });
  });

  it('returns false when the query function throws during refetch', async () => {
    api.loadBulletins.mockResolvedValueOnce(page([oldRecord]));
    const hook = renderHook(() => useBulletinListController(query), { wrapper: createWrapper() });
    await waitFor(() => expect(hook.result.current.state.kind).toBe('ready'));
    const originalRefresh = hook.result.current.refresh;

    api.loadBulletins.mockImplementationOnce(() => {
      throw new Error('observer boundary failed');
    });
    await act(async () => {
      await expect(originalRefresh()).resolves.toBe(false);
    });
  });
});

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function page(content: ReturnType<typeof bulletin>[]) {
  return { content, totalElements: content.length, totalPages: 1, number: 0, size: 8 };
}

function bulletin(id: number, name: string) {
  return {
    id,
    name,
    app: 'website',
    monitorIds: [1],
    fields: { responseTime: ['duration'] },
    creator: null,
    modifier: null,
    gmtCreate: null,
    gmtUpdate: null
  };
}
