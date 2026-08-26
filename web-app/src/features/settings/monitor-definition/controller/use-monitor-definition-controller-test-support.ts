/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { StrictMode, createElement, useLayoutEffect, type PropsWithChildren } from 'react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { vi } from 'vitest';

import type { MonitorDefinitionDetail } from '../model/monitor-definition-model';

const hoisted = vi.hoisted(() => ({
  api: {
    catalog: vi.fn(),
    create: vi.fn(),
    detail: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    validate: vi.fn(),
    visibility: vi.fn()
  },
  auth: { roles: ['ADMIN'] as string[] }
}));

export const api = hoisted.api;
export const auth = hoisted.auth;

vi.mock('../api/monitor-definition-api', async () => ({
  ...(await vi.importActual<typeof import('../api/monitor-definition-api')>('../api/monitor-definition-api')),
  createMonitorDefinition: hoisted.api.create,
  deleteMonitorDefinition: hoisted.api.remove,
  loadMonitorDefinitionCatalog: hoisted.api.catalog,
  loadMonitorDefinitionDetail: hoisted.api.detail,
  updateMonitorDefinition: hoisted.api.update,
  updateMonitorDefinitionVisibility: hoisted.api.visibility,
  validateMonitorDefinition: hoisted.api.validate
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: hoisted.auth.roles } })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: 'en-US' } }) }));

import { useMonitorDefinitionController } from './use-monitor-definition-controller';

export const revision = 'a'.repeat(64);
export const newerRevision = 'b'.repeat(64);
export const item = {
  app: 'mysql',
  label: 'MySQL',
  origin: 'override' as const,
  editable: true,
  deletable: true,
  hidden: false,
  revision
};
export const detail = { schemaVersion: 1 as const, ...item, definition: 'app: mysql' };

export const route: { navigate: NavigateFunction | null; search: string } = {
  navigate: null,
  search: ''
};

export function resetMonitorDefinitionControllerFixture() {
  vi.resetAllMocks();
  route.navigate = null;
  route.search = '';
  auth.roles = ['ADMIN'];
  api.catalog.mockResolvedValue({ schemaVersion: 1, items: [item] });
  api.detail.mockResolvedValue(detail);
  api.validate.mockResolvedValue({ schemaVersion: 1, valid: true, app: 'mysql', origin: 'override' });
  api.create.mockResolvedValue(detail);
  api.update.mockResolvedValue({ ...detail, revision: newerRevision });
  api.visibility.mockResolvedValue(undefined);
  api.remove.mockResolvedValue({ schemaVersion: 1, app: 'mysql', disposition: 'builtin_restored' });
}

export function updateWorkspace(value: MonitorDefinitionDetail) {
  return {
    kind: 'edit' as const,
    authority: value,
    draft: {
      mode: 'update' as const,
      expectedApp: value.app,
      definition: value.definition,
      revision: value.revision
    },
    failure: null,
    pending: null,
    validation: null,
    writeRecovery: null
  };
}

export function testClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function renderController(client = testClient()) {
  return renderControllerWithOptions(client, '/settings/monitor-definitions', false);
}

export function renderControllerAt(initialEntry: string, strict = false) {
  return renderControllerWithOptions(testClient(), initialEntry, strict);
}

function renderControllerWithOptions(client: QueryClient, initialEntry: string, strict: boolean) {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      createElement(RouterObserver),
      createElement(QueryClientProvider, { client }, strict ? createElement(StrictMode, null, children) : children)
    );
  return renderHook(() => useMonitorDefinitionController(), { wrapper });
}

function RouterObserver() {
  const navigate = useNavigate();
  const location = useLocation();
  useLayoutEffect(() => {
    route.navigate = navigate;
    route.search = location.search;
  }, [location.search, navigate]);
  return null;
}

export function observedNavigate() {
  const navigate = route.navigate;
  if (navigate === null) throw new Error('Router observer is not ready');
  return navigate;
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
