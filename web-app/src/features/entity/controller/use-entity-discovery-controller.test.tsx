/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

const api = vi.hoisted(() => ({ loadEntityDiscovery: vi.fn() }));
vi.mock('../api/entity-discovery-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-discovery-api')>()),
  ...api
}));

import { useEntityDiscoveryController } from './use-entity-discovery-controller';

const page = {
  schemaVersion: 1 as const,
  pageIndex: 0,
  pageSize: 8,
  totalElements: 1,
  totalPages: 1,
  content: [{ monitor: { id: 3, name: 'mysql', app: 'mysql', instance: 'db:3306', status: 1 }, candidates: [] }]
};

describe('useEntityDiscoveryController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEntityDiscovery.mockResolvedValue(page);
  });
  afterEach(cleanup);

  it('reads only safe URL state and submits a trimmed search at page zero', async () => {
    const routed = renderController('/entities/discovery?search=%20mysql%20&pageIndex=0&pageSize=8&token=private');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    expect(api.loadEntityDiscovery).toHaveBeenCalledWith(
      { search: 'mysql', pageIndex: 0, pageSize: 8 },
      expect.any(AbortSignal)
    );
    expect(routed.location()).not.toContain('token');
    act(() => routed.current().actions.updateDraft('  postgres  '));
    act(() => routed.current().actions.submit());
    await waitFor(() => expect(routed.location()).toContain('search=postgres'));
    expect(routed.location()).toContain('pageIndex=0');
  });

  it('uses canonical safe return targets for candidate, create, and back navigation', async () => {
    const routed = renderController('/entities/discovery?search=mysql&pageIndex=0&pageSize=8');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.openCandidate(7));
    expect(routed.location()).toContain('/entities/7?returnTo=');
    expect(routed.location()).not.toContain('token');

    const create = renderController('/entities/discovery?search=mysql&pageIndex=0&pageSize=8');
    await waitFor(() => expect(create.current().state.evidence.kind).toBe('ready'));
    act(() => create.current().actions.create());
    expect(create.location()).toContain('/entities/new?returnTo=');

    const back = renderController(
      '/entities/discovery?returnTo=%2Fentities%3Fsearch%3Dmysql%26type%3Ddatabase%26token%3Dprivate'
    );
    await waitFor(() => expect(back.current().state.evidence.kind).toBe('ready'));
    act(() => back.current().actions.back());
    expect(back.location()).toContain('/entities?');
    expect(back.location()).toContain('search=mysql');
    expect(back.location()).toContain('type=database');
    expect(back.location()).not.toContain('token');

    const unsafe = renderController(
      '/entities/discovery?returnTo=https%3A%2F%2Fevil.example%2Fentities%3Fsearch%3Dprivate'
    );
    await waitFor(() => expect(unsafe.current().state.evidence.kind).toBe('ready'));
    act(() => unsafe.current().actions.back());
    expect(unsafe.location()).toBe('/entities');
  });

  it('keeps discovery reads available to GUEST but rejects its create handoff', async () => {
    const routed = renderController('/entities/discovery?search=mysql', 'GUEST');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    expect(api.loadEntityDiscovery).toHaveBeenCalled();
    expect(routed.current().state.canWrite).toBe(false);
    act(() => routed.current().actions.create());
    expect(routed.location()).toContain('/entities/discovery');
  });
});

function renderController(entry: string, role = 'ADMIN') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let location = '';
  let controller: ReturnType<typeof useEntityDiscoveryController> | undefined;
  function ControllerProbe() {
    controller = useEntityDiscoveryController();
    return null;
  }
  function LocationProbe() {
    const current = useLocation();
    location = `${current.pathname}${current.search}`;
    return null;
  }
  render(
    <SessionContext.Provider value={sessionState(role)}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <ControllerProbe />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    </SessionContext.Provider>
  );
  return {
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    },
    location: () => location
  };
}

function sessionState(role: string) {
  return {
    loading: false,
    retry: vi.fn(),
    session: {
      authenticated: true,
      username: 'operator',
      roles: [role],
      workspaceId: 'default',
      expiresAt: null
    }
  };
}
