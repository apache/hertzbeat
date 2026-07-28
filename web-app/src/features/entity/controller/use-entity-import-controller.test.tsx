/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';

const api = vi.hoisted(() => ({ previewEntityDefinitionBundle: vi.fn(), commitEntityDefinitionBundle: vi.fn() }));
vi.mock('../api/entity-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-import-api')>()),
  ...api
}));

import { useEntityImportController } from './use-entity-import-controller';

const preview = [{ entity: { type: 'service', name: 'checkout' }, identities: [], monitorBinds: [], relations: [] }];

describe('useEntityImportController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.previewEntityDefinitionBundle.mockResolvedValue(preview);
    api.commitEntityDefinitionBundle.mockResolvedValue([41]);
  });
  afterEach(cleanup);

  it('previews without writing, invalidates on edit, then explicitly confirms the exact snapshot once', async () => {
    const routed = renderController('/entities/import?returnTo=%2Fentities%3Fsearch%3Dmysql%26token%3Dprivate');
    act(() => routed.current().actions.changeContent('kind: service'));
    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.preview?.length).toBe(1));
    expect(api.previewEntityDefinitionBundle).toHaveBeenCalledWith({ content: 'kind: service', format: 'yaml' });
    expect(api.commitEntityDefinitionBundle).not.toHaveBeenCalled();

    act(() => {
      routed.current().actions.preview();
      routed.current().actions.confirm();
    });
    expect(api.commitEntityDefinitionBundle).not.toHaveBeenCalled();
    await waitFor(() => expect(routed.current().state.previewing).toBe(false));

    act(() => routed.current().actions.changeContent('kind: database'));
    expect(routed.current().state.preview).toBeUndefined();
    act(() => routed.current().actions.confirm());
    expect(api.commitEntityDefinitionBundle).not.toHaveBeenCalled();

    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.confirmEnabled).toBe(true));
    act(() => {
      routed.current().actions.confirm();
      routed.current().actions.confirm();
      routed.current().actions.preview();
    });
    await waitFor(() => expect(routed.current().state.createdIds).toEqual([41]));
    expect(api.commitEntityDefinitionBundle).toHaveBeenCalledTimes(1);
    expect(api.previewEntityDefinitionBundle).toHaveBeenCalledTimes(3);
    expect(api.commitEntityDefinitionBundle).toHaveBeenCalledWith({ content: 'kind: database', format: 'yaml' }, 1);
  });

  it('keeps content out of the URL and cancels to the sanitized catalog target', () => {
    const routed = renderController('/entities/import?returnTo=%2Fentities%3Fsearch%3Dmysql%26token%3Dprivate');
    act(() => routed.current().actions.changeContent('password: private'));
    expect(routed.location()).not.toContain('password');
    expect(routed.location()).not.toContain('private');
    act(() => routed.current().actions.cancel());
    expect(routed.location()).toContain('/entities?');
    expect(routed.location()).toContain('search=mysql');
    expect(routed.location()).not.toContain('token');
  });

  it('locks editing and cancellation while the irreversible confirmation is in flight', async () => {
    let resolveCommit: ((ids: number[]) => void) | undefined;
    api.commitEntityDefinitionBundle.mockReturnValue(new Promise(resolve => (resolveCommit = resolve)));
    const routed = renderController('/entities/import');
    act(() => routed.current().actions.changeContent('kind: service'));
    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.confirmEnabled).toBe(true));
    act(() => routed.current().actions.confirm());
    await waitFor(() => expect(routed.current().state.confirming).toBe(true));
    act(() => {
      routed.current().actions.changeContent('kind: database');
      routed.current().actions.changeFormat('json');
      routed.current().actions.cancel();
    });
    expect(routed.current().state.draft.content).toBe('kind: service');
    expect(routed.current().state.draft.format).toBe('yaml');
    expect(routed.location()).toContain('/entities/import');
    act(() => resolveCommit?.([41]));
    await waitFor(() => expect(routed.current().state.createdIds).toEqual([41]));
  });

  it('fails closed for GUEST and clears preview ownership before a role-lost confirmation', async () => {
    const guest = renderController('/entities/import', 'GUEST');
    act(() => {
      guest.current().actions.changeContent('kind: service');
      guest.current().actions.preview();
      guest.current().actions.confirm();
    });
    expect(guest.current().state.canWrite).toBe(false);
    expect(api.previewEntityDefinitionBundle).not.toHaveBeenCalled();
    expect(api.commitEntityDefinitionBundle).not.toHaveBeenCalled();

    const routed = renderController('/entities/import', 'USER');
    act(() => routed.current().actions.changeContent('kind: service'));
    act(() => routed.current().actions.preview());
    await waitFor(() => expect(routed.current().state.confirmEnabled).toBe(true));
    routed.setRole('GUEST');
    await waitFor(() => expect(routed.current().state.canWrite).toBe(false));
    expect(routed.current().state.draft).toEqual({ content: '', format: 'yaml' });
    act(() => routed.current().actions.confirm());
    expect(api.commitEntityDefinitionBundle).not.toHaveBeenCalled();
  });
});

function renderController(entry: string, initialRole = 'ADMIN') {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  let role = initialRole;
  let location = '';
  let controller: ReturnType<typeof useEntityImportController> | undefined;
  function ControllerProbe() {
    controller = useEntityImportController();
    return null;
  }
  function LocationProbe() {
    const current = useLocation();
    location = `${current.pathname}${current.search}`;
    return null;
  }
  const rendered = render(
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
    location: () => location,
    setRole(nextRole: string) {
      role = nextRole;
      rendered.rerender(
        <SessionContext.Provider value={sessionState(role)}>
          <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[entry]}>
              <ControllerProbe />
              <LocationProbe />
            </MemoryRouter>
          </QueryClientProvider>
        </SessionContext.Provider>
      );
    }
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
