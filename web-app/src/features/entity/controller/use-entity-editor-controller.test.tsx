/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { SessionContext } from '@/core/auth/session-context';

const api = vi.hoisted(() => ({
  loadEditableEntity: vi.fn(),
  loadEntityCatalogSuggestions: vi.fn(),
  saveEditableEntity: vi.fn()
}));
const modal = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('../api/entity-editor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-editor-api')>()),
  ...api
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ modal }) }
}));

import { useEntityEditorController } from './use-entity-editor-controller';

describe('useEntityEditorController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEntityCatalogSuggestions.mockResolvedValue({
      owners: [],
      namespaces: [],
      environments: [],
      systems: [],
      lifecycles: [],
      tiers: [],
      inheritFromRefs: [],
      entityRefs: [],
      languages: [],
      linkProviders: []
    });
    api.saveEditableEntity.mockResolvedValue(41);
    api.loadEditableEntity.mockResolvedValue({
      entity: { id: 7, type: 'service', name: 'checkout' },
      identities: [],
      monitorBinds: [],
      relations: []
    });
  });
  afterEach(cleanup);

  it('navigates directly on clean cancel and confirms dirty cancel without writing', async () => {
    const routed = renderController('new', '/entities/new?returnTo=%2Fentities%3Fsearch%3Dcheckout');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));

    act(() => routed.current().actions.change('name', 'checkout'));
    expect(routed.current().state.dirty).toBe(true);
    act(() => routed.current().actions.cancel());
    expect(modal.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'entity.editor.discardConfirm' }));
    expect(routed.router.state.location.pathname).toBe('/entities/new');
    expect(api.saveEditableEntity).not.toHaveBeenCalled();

    const confirmation = modal.confirm.mock.calls[0]?.[0] as { onOk?: () => unknown } | undefined;
    act(() => {
      confirmation?.onOk?.();
    });
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities'));
    expect(api.saveEditableEntity).not.toHaveBeenCalled();

    const clean = renderController('new', '/entities/new?returnTo=%2Fentities');
    act(() => clean.current().actions.cancel());
    await waitFor(() => expect(clean.router.state.location.pathname).toBe('/entities'));
    expect(modal.confirm).toHaveBeenCalledTimes(1);
  });

  it('keeps the core form ready when suggestions fail', async () => {
    api.loadEntityCatalogSuggestions.mockRejectedValueOnce(new ApiMessageError('offline', { status: 503 }));
    const routed = renderController('new', '/entities/new');
    await waitFor(() => expect(routed.current().state.suggestions.kind).toBe('unavailable'));
    expect(routed.current().state.evidence.kind).toBe('ready');
  });

  it('does not publish a blank edit draft before the DTO is hydrated', async () => {
    const routed = renderController('edit', '/entities/7/edit');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    expect(routed.current().state.draft).toMatchObject({ type: 'service', name: 'checkout' });
  });

  it('invalidates entity queries and routes create success to the real detail', async () => {
    const routed = renderController('new', '/entities/new?returnTo=%2Fentities');
    const invalidate = vi.spyOn(routed.client, 'invalidateQueries');
    act(() => {
      routed.current().actions.change('type', 'service');
      routed.current().actions.change('name', 'checkout');
    });
    act(() => routed.current().actions.submit());
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities/41'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['entities', 'list'], refetchType: 'none' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['entities', 'detail'], refetchType: 'none' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['entities', 'editor', 41], refetchType: 'none' });
  });

  it('prefills a discovery monitor name and saves its binding without adding form complexity', async () => {
    const routed = renderController(
      'new',
      '/entities/new?sourceMonitorId=3&sourceMonitorName=primary-db&returnTo=%2Fentities%2Fdiscovery'
    );
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    expect(routed.current().state.draft.name).toBe('primary-db');
    expect(routed.current().state.dirty).toBe(false);

    act(() => routed.current().actions.change('type', 'database'));
    act(() => routed.current().actions.submit());

    await waitFor(() => expect(api.saveEditableEntity).toHaveBeenCalledOnce());
    expect(api.saveEditableEntity).toHaveBeenCalledWith(
      'new',
      expect.objectContaining({
        monitorBinds: [{ monitorId: 3, bindType: 'manual', bindSource: 'manual', status: 'active', score: 100 }]
      })
    );
  });

  it('keeps the submitted draft authoritative until the write settles', async () => {
    let resolveSave: ((id: number) => void) | undefined;
    api.saveEditableEntity.mockReturnValueOnce(new Promise<number>(resolve => (resolveSave = resolve)));
    const routed = renderController('new', '/entities/new');
    act(() => {
      routed.current().actions.change('type', 'service');
      routed.current().actions.change('name', 'checkout');
    });
    act(() => routed.current().actions.submit());
    await waitFor(() => expect(routed.current().state.saving).toBe(true));

    act(() => {
      routed.current().actions.change('name', 'post-submit-edit');
      routed.current().actions.cancel();
    });

    expect(routed.current().state.draft.name).toBe('checkout');
    expect(modal.confirm).not.toHaveBeenCalled();
    act(() => resolveSave?.(41));
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities/41'));
  });

  it('redacts permission failures into a stable view state', async () => {
    api.saveEditableEntity.mockRejectedValueOnce(new ApiMessageError('private server detail', { status: 403 }));
    const routed = renderController('new', '/entities/new');
    act(() => {
      routed.current().actions.change('type', 'service');
      routed.current().actions.change('name', 'checkout');
    });
    act(() => routed.current().actions.submit());
    await waitFor(() => expect(routed.current().state.saveFailure).toBe('permission'));
    expect(JSON.stringify(routed.current().state)).not.toContain('private server detail');
  });

  it('maps server envelope validation to redacted form guidance', async () => {
    api.saveEditableEntity.mockRejectedValueOnce(
      new ApiMessageError('private validation detail', { status: 200, code: 1 })
    );
    const routed = renderController('new', '/entities/new');
    act(() => {
      routed.current().actions.change('type', 'service');
      routed.current().actions.change('name', 'checkout');
    });
    act(() => routed.current().actions.submit());
    await waitFor(() => expect(routed.current().state.saveFailure).toBe('validation'));
    expect(JSON.stringify(routed.current().state)).not.toContain('private validation detail');
  });

  it('saves after correcting an initially invalid submission', async () => {
    const routed = renderController('new', '/entities/new');
    act(() => routed.current().actions.submit());
    expect(routed.current().state.errors).toMatchObject({ type: 'required', name: 'required' });
    act(() => {
      routed.current().actions.change('type', 'service');
      routed.current().actions.change('name', 'checkout');
    });
    act(() => routed.current().actions.submit());
    await waitFor(() => expect(api.saveEditableEntity).toHaveBeenCalledTimes(1));
  });

  it('fails closed for GUEST without loading editor data and retires a dirty draft before a role-lost submit', async () => {
    const guest = renderController('edit', '/entities/7/edit', 'GUEST');
    expect(guest.current().state.evidence.kind).toBe('permission');
    await act(async () => Promise.resolve());
    expect(api.loadEditableEntity).not.toHaveBeenCalled();
    expect(api.loadEntityCatalogSuggestions).not.toHaveBeenCalled();
    act(() => {
      guest.current().actions.change('type', 'service');
      guest.current().actions.change('name', 'checkout');
      guest.current().actions.submit();
    });
    expect(api.saveEditableEntity).not.toHaveBeenCalled();

    const routed = renderController('new', '/entities/new', 'USER');
    act(() => {
      routed.current().actions.change('type', 'service');
      routed.current().actions.change('name', 'private-draft');
    });
    expect(routed.current().state.dirty).toBe(true);
    routed.setRole('GUEST');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('permission'));
    expect(routed.current().state.draft.name).toBe('');
    act(() => routed.current().actions.submit());
    expect(api.saveEditableEntity).not.toHaveBeenCalled();
  });
});

function renderController(mode: 'new' | 'edit', entry: string, initialRole = 'ADMIN') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let role = initialRole;
  let controller: ReturnType<typeof useEntityEditorController> | undefined;
  function Probe() {
    controller = useEntityEditorController(mode);
    return null;
  }
  const element = (
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>
  );
  const router = createMemoryRouter(
    [
      { path: '/entities/new', element },
      { path: '/entities/:entityId/edit', element },
      { path: '/entities/:entityId', element: null },
      { path: '/entities', element: null }
    ],
    { initialEntries: [entry] }
  );
  const rendered = render(
    <SessionContext.Provider value={sessionState(role)}>
      <RouterProvider router={router} />
    </SessionContext.Provider>
  );
  return {
    client,
    router,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    },
    setRole(nextRole: string) {
      role = nextRole;
      rendered.rerender(
        <SessionContext.Provider value={sessionState(role)}>
          <RouterProvider router={router} />
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
