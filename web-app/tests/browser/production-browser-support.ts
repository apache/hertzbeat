/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { expect, type Page, type Route } from '@playwright/test';

export type BrowserBackend = {
  setupComplete: boolean;
  authenticated: boolean;
  setupPhase?: 'configuration_required' | 'administrator_required' | 'optional_configuration' | 'complete';
  setupUsername?: string;
  setupAdministratorWrites?: number;
  setupCompletionWrites?: number;
  liveLogSse?: boolean;
  monitorRows?: boolean;
  topologyRequests?: number;
};

const liveLogSseOrigin = `http://127.0.0.1:${process.env.HERTZBEAT_SMOKE_SSE_PORT ?? '4290'}`;

export async function installBackendContract(page: Page, backend: BrowserBackend) {
  await page.route('**/api/**', route => respond(route, backend));
}

async function respond(route: Route, backend: BrowserBackend) {
  const request = route.request();
  const requestUrl = new URL(request.url());
  const path = requestUrl.pathname;
  if (backend.liveLogSse && path === '/api/logs/sse/subscribe') {
    await route.continue({ url: `${liveLogSseOrigin}${path}${requestUrl.search}` });
    return;
  }
  if (path === '/api/topology') backend.topologyRequests = (backend.topologyRequests ?? 0) + 1;
  const setupPostData = path === '/api/setup/administrator' ? (request.postDataJSON() as unknown) : null;
  if (await respondSetupRequest(route, backend, path, request.method(), setupPostData)) return;
  if (await respondSessionRequest(route, backend, path, request.method())) return;
  if (path.endsWith('/sse/subscribe')) {
    await route.fulfill({ status: 204 });
    return;
  }
  const data = backendReadFixture(path, backend);
  await route.fulfill({ json: message(data) });
}

async function respondSetupRequest(
  route: Route,
  backend: BrowserBackend,
  path: string,
  method: string,
  postData: unknown
) {
  if (path === '/api/setup/status') {
    await route.fulfill({
      json: setupStatus(backend.setupPhase ?? (backend.setupComplete ? 'complete' : 'configuration_required'))
    });
    return true;
  }
  if (path === '/api/setup/administrator' && method === 'POST') {
    const body = postData as { username: string };
    backend.setupAdministratorWrites = (backend.setupAdministratorWrites ?? 0) + 1;
    backend.setupUsername = body.username;
    backend.setupPhase = 'optional_configuration';
    await route.fulfill({ json: { username: body.username, phase: 'optional_configuration' } });
    return true;
  }
  if (path === '/api/setup/complete' && method === 'POST') {
    backend.setupCompletionWrites = (backend.setupCompletionWrites ?? 0) + 1;
    backend.setupComplete = true;
    backend.setupPhase = 'complete';
    await route.fulfill({
      json: {
        phase: 'complete',
        completedAt: '2026-08-13T00:01:00Z',
        loginPath: '/passport/login',
        username: backend.setupUsername ?? 'bootstrap-admin'
      }
    });
    return true;
  }
  return false;
}

async function respondSessionRequest(route: Route, backend: BrowserBackend, path: string, method: string) {
  if (path === '/api/ui/session') {
    if (method === 'POST') backend.authenticated = true;
    await route.fulfill({ json: { code: 0, data: session(backend.authenticated), msg: null } });
    return true;
  }
  if (path === '/api/ui/session/refresh') {
    await route.fulfill({ json: message(session(backend.authenticated)) });
    return true;
  }
  return false;
}

function backendReadFixture(path: string, backend: BrowserBackend) {
  if (path === '/api/topology') return topologyGraph();
  if (path === '/api/apps/defines') return {};
  if (path === '/api/apps/hierarchy') return [];
  if (path === '/api/monitors') return monitorPage(backend.monitorRows === true);
  if (path === '/api/config/mute') return { mute: false };
  if (path === '/api/alerts/summary') return alertSummary();
  if (path === '/api/ui/runtime-status') return runtimeStatus();
  return null;
}

function monitorPage(withRows: boolean) {
  const content = withRows
    ? [{ id: 7, name: 'checkout-api', app: 'website', instance: 'prod', status: 1, gmtUpdate: 1_787_040_000_000 }]
    : [];
  return { content, totalElements: content.length, pageIndex: 0, pageSize: 10 };
}

function alertSummary() {
  return {
    total: 0,
    dealNum: 0,
    rate: 0,
    priorityWarningNum: 0,
    priorityCriticalNum: 0,
    priorityEmergencyNum: 0
  };
}

function runtimeStatus() {
  return {
    schemaVersion: 1,
    observedAt: '2026-08-13T00:00:00Z',
    server: { status: 'available', errorCode: null },
    storage: { kind: 'greptime', status: 'available', errorCode: null },
    collectors: {
      status: 'degraded',
      total: 0,
      online: 0,
      runtimeHealthy: 0,
      lastReportedAt: null,
      errorCode: 'collector_status_unavailable'
    }
  };
}

function topologyGraph() {
  const emptyMetrics = {
    requestRatePerSecond: null,
    requestCount: null,
    errorRate: null,
    errorCount: null,
    latencyP95Ms: null,
    latencyAvgMs: null
  };
  return {
    apiBacked: true,
    focusEntityId: 10,
    depth: 1,
    partial: false,
    partialReasons: [],
    edgePage: { pageIndex: 0, pageSize: 25, totalElements: 1, hasNext: false },
    sourceKinds: ['entity-relation', 'otlp-trace-call'],
    nodes: [
      {
        id: '10',
        entityId: 10,
        entityName: 'checkout-api',
        entityType: 'service',
        namespace: 'commerce',
        environment: 'production',
        health: 'warning',
        focus: true,
        evidenceBadges: ['entity-relation'],
        redMetrics: {
          requestRatePerSecond: 18.5,
          requestCount: 1110,
          errorRate: 0.012,
          errorCount: 13,
          latencyP95Ms: 94,
          latencyAvgMs: 41
        }
      },
      {
        id: '20',
        entityId: 20,
        entityName: 'payments-api',
        entityType: 'service',
        namespace: 'commerce',
        environment: 'production',
        health: 'healthy',
        focus: false,
        evidenceBadges: ['entity-relation'],
        redMetrics: emptyMetrics
      }
    ],
    edges: [
      {
        id: 'trace:10:20',
        relationId: null,
        sourceNodeId: '10',
        targetNodeId: '20',
        sourceEntityId: 10,
        targetEntityId: 20,
        targetRef: null,
        sampleTraceId: 'trace-10-20',
        sampleSpanId: 'span-10-20',
        firstSeen: '2026-08-13T02:00:00Z',
        lastSeen: '2026-08-13T02:30:00Z',
        relationType: 'trace_call',
        relationSource: 'otlp-trace-call',
        status: 'confirmed',
        score: 98,
        evidenceBadges: ['otlp-trace-call'],
        redMetrics: {
          requestRatePerSecond: 11.25,
          requestCount: 675,
          errorRate: 0.004,
          errorCount: 3,
          latencyP95Ms: 61,
          latencyAvgMs: 28
        }
      }
    ],
    impactTimeline: []
  };
}

export function liveLogRow(body: string) {
  return {
    timeUnixNano: 1_787_040_000_000_000_000,
    observedTimeUnixNano: null,
    severityNumber: 9,
    severityText: 'INFO',
    body,
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
}

type LiveLogSseState = {
  active: number;
  closed: number;
  opened: number;
  paths: string[];
};

export async function readLiveLogSseState() {
  const response = await fetch(`${liveLogSseOrigin}/__control/state`);
  return (await response.json()) as LiveLogSseState;
}

export async function emitLiveLogEvent(name: 'LOG_EVENT' | 'LOG_STREAM_GAP', data: unknown) {
  await fetch(`${liveLogSseOrigin}/__control/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data })
  });
}

export async function dropLiveLogStreams() {
  await fetch(`${liveLogSseOrigin}/__control/drop`, { method: 'POST' });
}

function message(data: unknown) {
  return { code: 0, data, msg: null };
}

function setupStatus(phase: NonNullable<BrowserBackend['setupPhase']>) {
  const complete = phase === 'complete';
  const administratorConfigured = complete || phase === 'optional_configuration';
  return {
    phase,
    observedAt: '2026-08-13T00:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: {
      kind: complete ? 'h2' : null,
      configured: complete,
      source: 'built_in_default',
      restartRequired: false
    },
    telemetryStore: {
      kind: 'greptime',
      configured: complete,
      source: 'built_in_default',
      restartRequired: false
    },
    administratorConfigured,
    optional: {
      publicBaseUrlConfigured: false,
      serverOtlpHttpConfigured: false,
      serverOtlpGrpcConfigured: false,
      retentionConfigured: false,
      mailConfigured: false
    },
    pendingWarnings: []
  };
}

export async function expectBrowserSecretAbsent(page: Page, secret: string) {
  const storedEntries = await page.evaluate(
    'JSON.stringify({ localStorage: Object.entries(localStorage), sessionStorage: Object.entries(sessionStorage) })'
  );
  expect(`${page.url()}\n${String(storedEntries)}`).not.toContain(secret);
}

function session(authenticated: boolean) {
  return authenticated
    ? {
        authenticated: true,
        username: 'operator',
        roles: ['ADMIN'],
        workspaceId: 'default',
        expiresAt: null
      }
    : { authenticated: false, username: null, roles: [], workspaceId: null, expiresAt: null };
}

export function captureBrowserFailures(page: Page) {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(`pageerror:${error.name}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console:${message.text()}`);
  });
  return failures;
}
