/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { createElement, useEffect, type PropsWithChildren } from 'react';
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom';
import { vi } from 'vitest';

import type { CollectorInstrumentationIntake } from '@/shared/collector';

import {
  clearCollectorInstrumentationIntake,
  loadCollectorManagementPage,
  loadCollectorMutationProofPage,
  mutateCollectors,
  saveCollectorInstrumentationIntake
} from '../api/collector-management-api';
import { loadCollectorRuntimeConfig, saveCollectorRuntimeConfig } from '../api/collector-runtime-config-api';
import type { ManagedOtelRuntimeConfig } from '../api/collector-runtime-config-schema';
import { waitForCollectorRuntimeApplication } from './collector-runtime-report-convergence';
import { useCollectorController } from './use-collector-controller';

vi.mock('../api/collector-management-api', () => ({
  loadCollectorManagementPage: vi.fn(),
  loadCollectorMutationProofPage: vi.fn(),
  mutateCollectors: vi.fn(),
  saveCollectorInstrumentationIntake: vi.fn(),
  clearCollectorInstrumentationIntake: vi.fn()
}));
vi.mock('../api/collector-runtime-config-api', () => ({
  loadCollectorRuntimeConfig: vi.fn(),
  saveCollectorRuntimeConfig: vi.fn()
}));
vi.mock('./collector-runtime-report-convergence', () => ({
  waitForCollectorRuntimeApplication: vi.fn().mockImplementation((_collector: string, revision: number) =>
    Promise.resolve({
      kind: 'applied',
      revision,
      state: 'RUNNING',
      reportedAt: '2026-07-22T10:01:05Z'
    })
  )
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const hoisted = vi.hoisted(() => ({ access: { roles: ['ADMIN'] as string[] } }));

vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { roles: hoisted.access.roles }, loading: false, retry: vi.fn() })
}));

export const load = vi.mocked(loadCollectorManagementPage);
export const loadProof = vi.mocked(loadCollectorMutationProofPage);
export const mutate = vi.mocked(mutateCollectors);
export const saveIntake = vi.mocked(saveCollectorInstrumentationIntake);
export const clearIntake = vi.mocked(clearCollectorInstrumentationIntake);
export const loadRuntime = vi.mocked(loadCollectorRuntimeConfig);
export const saveRuntime = vi.mocked(saveCollectorRuntimeConfig);
export const waitForRuntimeApplication = vi.mocked(waitForCollectorRuntimeApplication);
export const access = hoisted.access;

export let navigateRoute: NavigateFunction | undefined;

export function resetCollectorControllerFixture() {
  access.roles = ['ADMIN'];
}

export function clearCollectorControllerFixture() {
  vi.clearAllMocks();
}

export function useCollectorControllerTestHook() {
  return useCollectorController();
}

export function wrapper(
  initialEntry: string,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
) {
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(App, null, createElement(NavigationProbe), children)
      )
    );
  };
}

function NavigationProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRoute = navigate;
    return () => {
      navigateRoute = undefined;
    };
  }, [navigate]);
  return null;
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

export function page(number: number, content: ReturnType<typeof collector>[], totalElements: number) {
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / 8),
    number,
    size: 8
  };
}

export function collector(name: string, instrumentationIntake: CollectorInstrumentationIntake = intakeUnavailable()) {
  return {
    name,
    address: '10.0.0.7',
    version: '2.0.0',
    mode: 'public',
    online: true,
    immutable: false,
    pinMonitorNum: 0,
    dispatchMonitorNum: 0,
    updatedAt: null,
    runtimeReport: null,
    instrumentationIntake
  };
}

export function intakeRequest() {
  return {
    schemaVersion: 1 as const,
    gateway: 'server' as const,
    capabilities: ['otlp_grpc'] as const,
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
  };
}

export function intakeAvailable() {
  return {
    status: 'available' as const,
    schemaVersion: 1 as const,
    collectorId: 'edge',
    gateway: 'server' as const,
    capabilities: ['otlp_grpc'] as const,
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
    authorizationHeader: 'Authorization' as const
  };
}

export function intakeUnavailable(
  errorCode:
    | 'intake_not_advertised'
    | 'intake_advertisement_invalid'
    | 'intake_advertisement_unavailable' = 'intake_not_advertised'
) {
  return { status: 'unavailable' as const, errorCode };
}

export function runtimeConfig(overrides: Partial<ManagedOtelRuntimeConfig> = {}): ManagedOtelRuntimeConfig {
  return {
    schemaVersion: 3 as const,
    revision: 7,
    hostMetricsEnabled: true,
    hostMetricsInterval: 'PT30S',
    prometheusTargets: [
      {
        name: 'payments',
        endpoint: 'https://payments.example.test:9464/metrics',
        interval: 'PT30S',
        timeout: 'PT5S',
        headerSecretRefs: { 'X-Scrape-Key': 'payments-key-ref' },
        tlsCaProfile: 'internal-ca'
      }
    ],
    fileLogSources: [{ name: 'payments', pathProfile: 'payments-logs' }],
    environment: 'production',
    resourceDetectors: ['ENV', 'SYSTEM'],
    telemetryFilterPresets: [],
    hostMetricsScrapers: ['CPU', 'MEMORY'],
    ...overrides
  };
}

export function runtimeDraft(overrides: Record<string, unknown> = {}) {
  return {
    environment: 'production',
    hostMetricsEnabled: true,
    hostMetricsIntervalSeconds: 30,
    hostMetricsScrapers: ['CPU', 'MEMORY'],
    resourceDetectors: ['ENV', 'SYSTEM'],
    telemetryFilterPresets: [],
    ...overrides
  };
}

export function prometheusDraft(overrides: Record<string, unknown> = {}) {
  return {
    name: 'payments',
    endpoint: 'https://payments.example.test:9464/metrics',
    intervalSeconds: 30,
    timeoutSeconds: 10,
    headerSecretRefs: [],
    tlsCaProfile: '',
    ...overrides
  };
}
