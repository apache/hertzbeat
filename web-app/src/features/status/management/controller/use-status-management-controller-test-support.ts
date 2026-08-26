/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { StatusRequestFailure } from '@/features/status/shared/status-error-model';

import type { StatusComponent, StatusIncident, StatusOrgRecord } from '../model/status-management-contract';

const hoisted = vi.hoisted(() => ({
  api: {
    deleteStatusComponent: vi.fn(),
    deleteStatusIncident: vi.fn(),
    loadStatusComponent: vi.fn(),
    loadStatusComponents: vi.fn(),
    loadStatusIncident: vi.fn(),
    loadStatusIncidents: vi.fn(),
    loadStatusOrg: vi.fn(),
    saveStatusComponent: vi.fn(),
    saveStatusIncident: vi.fn(),
    saveStatusOrg: vi.fn()
  },
  notification: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  access: { roles: ['ADMIN'] as string[] },
  projection: { componentUpdate: vi.fn(), incidentUpdate: vi.fn() }
}));

vi.mock('../api/status-management-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/status-management-api')>()),
  ...hoisted.api
}));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: hoisted.notification }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { roles: hoisted.access.roles }, loading: false, retry: vi.fn() })
}));
vi.mock('./status-component-projection', async importOriginal => {
  const original = await importOriginal<typeof import('./status-component-projection')>();
  return {
    ...original,
    projectStatusComponentUpdate: (...args: Parameters<typeof original.projectStatusComponentUpdate>) => {
      hoisted.projection.componentUpdate();
      return original.projectStatusComponentUpdate(...args);
    }
  };
});
vi.mock('./status-incident-projection', async importOriginal => {
  const original = await importOriginal<typeof import('./status-incident-projection')>();
  return {
    ...original,
    projectStatusIncidentUpdate: (...args: Parameters<typeof original.projectStatusIncidentUpdate>) => {
      hoisted.projection.incidentUpdate();
      return original.projectStatusIncidentUpdate(...args);
    }
  };
});

import { useStatusManagementController } from './use-status-management-controller';

export const api = hoisted.api;
export const notification = hoisted.notification;
export const access = hoisted.access;
export const projection = hoisted.projection;

export const org: StatusOrgRecord = {
  id: 1,
  name: 'HertzBeat',
  description: 'Status',
  home: '/',
  logo: '/logo.svg',
  state: 0
};
export const component: StatusComponent = {
  id: 4,
  orgId: 1,
  name: 'API',
  method: 0,
  configState: 0,
  state: 0
};
export const incident: StatusIncident = {
  id: 7,
  orgId: 1,
  name: 'Outage',
  state: 0,
  components: [component],
  contents: []
};

export function resetStatusManagementControllerFixture() {
  vi.resetAllMocks();
  access.roles = ['ADMIN'];
  api.loadStatusOrg.mockResolvedValue(org);
  api.loadStatusComponents.mockResolvedValue([component]);
  api.loadStatusIncidents.mockResolvedValue(incidentPage([incident], 1));
  api.loadStatusComponent.mockResolvedValue(component);
  api.loadStatusIncident.mockResolvedValue(incident);
  api.saveStatusOrg.mockResolvedValue(org);
  api.saveStatusComponent.mockResolvedValue(undefined);
  api.saveStatusIncident.mockResolvedValue(undefined);
  api.deleteStatusComponent.mockResolvedValue(undefined);
  api.deleteStatusIncident.mockResolvedValue(undefined);
}

export function renderController(entry = '/settings/status-page') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: [entry] }, children));
  return { ...renderHook(() => useStatusManagementController(), { wrapper }), client };
}

export function incidentPage(content: StatusIncident[], totalElements: number) {
  return { content, totalElements, totalPages: Math.ceil(totalElements / 8), number: 0, size: 8 };
}

export function componentWithoutId(value: StatusComponent) {
  const draft = { ...value };
  delete draft.id;
  return draft;
}

export function unavailableRequestFailure() {
  return new StatusRequestFailure('unavailable', 'uncertain');
}

export function uncertainRequestFailure() {
  return new StatusRequestFailure('error', 'uncertain');
}

export function rejectedRequestFailure() {
  return new StatusRequestFailure('error', 'rejected');
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
