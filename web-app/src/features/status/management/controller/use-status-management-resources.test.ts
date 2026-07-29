/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryOptions = {
  enabled: boolean;
  queryFn: (context: { signal: AbortSignal }) => unknown;
};

const reactQuery = vi.hoisted(() => {
  const queryClient = {
    cancelQueries: vi.fn(() => Promise.resolve()),
    removeQueries: vi.fn()
  };
  return {
    queryClient,
    useQuery: vi.fn<(options: QueryOptions) => object>(() => ({})),
    useQueryClient: vi.fn(() => queryClient)
  };
});
vi.mock('@tanstack/react-query', () => reactQuery);
const api = vi.hoisted(() => ({
  loadStatusComponents: vi.fn(),
  loadStatusIncidents: vi.fn(),
  loadStatusOrg: vi.fn()
}));
vi.mock('../api/status-management-api', () => api);

import { useStatusManagementResources } from './use-status-management-resources';

describe('useStatusManagementResources', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes TanStack cancellation signals through every initial read', async () => {
    const query = { search: '', pageIndex: 0, pageSize: 8 };
    renderHook(() => useStatusManagementResources(query, true));
    const controller = new AbortController();

    await Promise.all(
      reactQuery.useQuery.mock.calls.map(([options]) => options.queryFn({ signal: controller.signal }))
    );

    expect(api.loadStatusOrg).toHaveBeenCalledWith(controller.signal);
    expect(api.loadStatusComponents).toHaveBeenCalledWith(controller.signal);
    expect(api.loadStatusIncidents).toHaveBeenCalledWith(query, controller.signal);
  });

  it('keeps every status read disabled until the session has an admitted role', () => {
    renderHook(() => useStatusManagementResources({ search: '', pageIndex: 0, pageSize: 8 }, false));

    expect(reactQuery.useQuery.mock.calls.map(([options]) => options.enabled)).toEqual([false, false, false]);
  });

  it('cancels and removes the complete status query family when read capability is lost', () => {
    const query = { search: '', pageIndex: 0, pageSize: 8 };
    const view = renderHook(({ canRead }) => useStatusManagementResources(query, canRead), {
      initialProps: { canRead: true }
    });

    view.rerender({ canRead: false });

    expect(reactQuery.queryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: ['status-management'] });
    expect(reactQuery.queryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['status-management'] });
  });
});
