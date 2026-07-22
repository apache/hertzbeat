/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uiSessionSchema } from '@/core/auth/session-contract';

import { MonitorDefinitionRequestError } from '../api/monitor-definition-api';

const api = vi.hoisted(() => ({
  catalog: vi.fn(),
  create: vi.fn(),
  detail: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
  validate: vi.fn()
}));
const auth = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('../api/monitor-definition-api', async () => ({
  ...(await vi.importActual<typeof import('../api/monitor-definition-api')>('../api/monitor-definition-api')),
  createMonitorDefinition: api.create,
  deleteMonitorDefinition: api.remove,
  loadMonitorDefinitionCatalog: api.catalog,
  loadMonitorDefinitionDetail: api.detail,
  updateMonitorDefinition: api.update,
  validateMonitorDefinition: api.validate
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: auth.roles } })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: 'en-US' } }) }));

import { useMonitorDefinitionController } from './use-monitor-definition-controller';

const revision = 'a'.repeat(64);
const newerRevision = 'b'.repeat(64);
const item = { app: 'mysql', label: 'MySQL', origin: 'override' as const, editable: true, deletable: true, revision };
const detail = { schemaVersion: 1 as const, ...item, definition: 'app: mysql' };

describe('useMonitorDefinitionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['ADMIN'];
    api.catalog.mockResolvedValue({ schemaVersion: 1, items: [item] });
    api.detail.mockResolvedValue(detail);
    api.validate.mockResolvedValue({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });
    api.create.mockResolvedValue(detail);
    api.update.mockResolvedValue({ ...detail, revision: newerRevision });
    api.remove.mockResolvedValue({ schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' });
  });

  it('loads, searches, views, and cancels without writes', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.setSearch('missing'));
    expect(result.current.items).toEqual([]);
    await act(() => result.current.actions.openView('mysql'));
    expect(result.current.workspace).toMatchObject({ kind: 'view', detail });
    act(() => result.current.actions.closeWorkspace());
    expect(result.current.workspace).toBeNull();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it.each(['view', 'edit'] as const)('keeps a failed %s read as a retryable read error', async mode => {
    api.detail.mockRejectedValue(new MonitorDefinitionRequestError('unavailable'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));

    await act(() =>
      mode === 'view' ? result.current.actions.openView('mysql') : result.current.actions.openEdit('mysql')
    );

    expect(result.current.workspace).toEqual({
      kind: 'error',
      mode,
      app: 'mysql',
      failure: 'unavailable'
    });
    expect(result.current.workspace).not.toMatchObject({ kind: 'edit', draft: { mode: 'create' } });
  });

  it('validates and saves exact create and update drafts', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openCreate());
    act(() => result.current.actions.setDefinition('app: custom'));
    await act(() => result.current.actions.validate());
    expect(api.validate).toHaveBeenCalledWith({ operation: 'create', expectedApp: null, definition: 'app: custom' });
    await act(() => result.current.actions.save());
    expect(api.create).toHaveBeenCalledWith('app: custom', 'en-US');

    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: changed'));
    await act(() => result.current.actions.save());
    expect(api.update).toHaveBeenCalledWith('mysql', 'app: mysql\nname: changed', revision, 'en-US');
  });

  it('admits only one editor command in the same render and cannot close it while pending', async () => {
    let finishValidation:
      ((value: { schemaVersion: 1; valid: true; app: string; origin: 'custom' }) => void) | undefined;
    api.validate.mockImplementation(
      () =>
        new Promise(resolve => {
          finishValidation = resolve;
        })
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.openCreate());
    act(() => result.current.actions.setDefinition('app: custom'));

    let first!: Promise<void>;
    act(() => {
      first = result.current.actions.validate();
      void result.current.actions.validate();
      result.current.actions.closeWorkspace();
    });

    expect(api.validate).toHaveBeenCalledTimes(1);
    expect(result.current.workspace).toMatchObject({ kind: 'edit', pending: 'validate' });
    finishValidation?.({ schemaVersion: 1, valid: true, app: 'custom', origin: 'custom' });
    await act(() => first);
    expect(result.current.workspace).toMatchObject({ kind: 'edit', pending: null });
  });

  it('keeps a conflicting draft until explicit authoritative refresh', async () => {
    api.update.mockRejectedValueOnce(new MonitorDefinitionRequestError('revision-conflict'));
    api.detail.mockResolvedValueOnce(detail).mockResolvedValueOnce({
      ...detail,
      definition: 'app: mysql\nname: server',
      revision: newerRevision
    });
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    await act(() => result.current.actions.openEdit('mysql'));
    act(() => result.current.actions.setDefinition('app: mysql\nname: local'));
    await act(() => result.current.actions.save());
    expect(result.current.workspace).toMatchObject({ kind: 'edit', failure: 'revision-conflict' });

    await act(() => result.current.actions.refreshConflict());
    expect(result.current.workspace).toMatchObject({
      kind: 'edit',
      draft: { definition: 'app: mysql\nname: server', revision: newerRevision },
      failure: null
    });
  });

  it('reports both delete dispositions and enforces local ADMIN write admission', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    act(() => result.current.actions.requestDelete(item));
    await act(() => result.current.actions.confirmDelete());
    expect(api.remove).toHaveBeenCalledWith('mysql', revision);
    expect(result.current.notice).toBe('builtin_restored');

    auth.roles = ['USER'];
    const reader = renderController();
    await waitFor(() => expect(reader.result.current.listState.kind).toBe('ready'));
    expect(reader.result.current.canWrite).toBe(false);
    act(() => reader.result.current.actions.openCreate());
    expect(reader.result.current.workspace).toBeNull();
  });

  it('admits the real lowercase admin role after the shared session boundary normalizes it', async () => {
    auth.roles = uiSessionSchema.parse({
      authenticated: true,
      username: 'admin',
      roles: [' admin '],
      workspaceId: 'default',
      expiresAt: null
    }).roles;

    const { result } = renderController();
    await waitFor(() => expect(result.current.listState.kind).toBe('ready'));
    expect(result.current.canWrite).toBe(true);
    act(() => result.current.actions.openCreate());
    expect(result.current.workspace).toMatchObject({ kind: 'edit', draft: { mode: 'create' } });
  });
});

function renderController() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMonitorDefinitionController(), { wrapper });
}
