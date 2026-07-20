/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBulletinMetrics } from './bulletin-metrics-controller';

const api = vi.hoisted(() => ({ loadBulletinMetrics: vi.fn() }));

vi.mock('../api/bulletin-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/bulletin-api')>()),
  loadBulletinMetrics: api.loadBulletinMetrics
}));

describe('Bulletin metrics controller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('classifies a non-empty response with zero rendered fields as empty', async () => {
    api.loadBulletinMetrics.mockResolvedValue({
      name: 'Ops',
      content: [
        {
          monitorName: 'site',
          monitorId: 7,
          host: 'localhost',
          metrics: [{ name: 'responseTime', fields: [[], []] }]
        }
      ]
    });
    const hook = renderHook(() => useBulletinMetrics(7), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current).toEqual({ kind: 'empty' }));
  });
});

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
