/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/core/http/http-client', () => ({ apiFetch }));

import {
  activateMigration,
  exportMigration,
  loadDeployment,
  loadMigration,
  startMigration,
  validateMigration
} from './deployment-api';

describe('deployment API', () => {
  beforeEach(() => apiFetch.mockReset());

  it('uses only frozen no-store contract paths and forwards abort signals', async () => {
    const signal = new AbortController().signal;
    apiFetch
      .mockResolvedValueOnce(jsonResponse(deploymentFixture()))
      .mockResolvedValueOnce(jsonResponse(validationFixture()))
      .mockResolvedValueOnce(jsonResponse(migrationFixture()))
      .mockResolvedValueOnce(jsonResponse(migrationFixture({ operationId: 'operation-a' })))
      .mockResolvedValueOnce(jsonResponse(migrationFixture()));
    const request = migrationRequest();

    await loadDeployment(signal);
    await validateMigration({ target: request.target, targetDatabase: request.targetDatabase }, signal);
    await startMigration(request, signal);
    await loadMigration('operation-a', signal);
    await activateMigration('migration-1', { expectedState: 'ready_to_activate' }, signal);

    const calls = apiFetch.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.map(([path]) => path)).toEqual([
      '/api/config/deployment',
      '/api/config/deployment/validate',
      '/api/config/deployment/metadata-migrations',
      '/api/config/deployment/metadata-migrations/operation-a',
      '/api/config/deployment/metadata-migrations/migration-1/activate'
    ]);
    expect(calls.every(([, init]) => init.cache === 'no-store' && init.signal === signal)).toBe(true);
  });

  it.each(['yaml', 'env', 'kubernetes_secret'] as const)('exports %s with exact one-time credentials', async format => {
    apiFetch.mockResolvedValue(attachmentResponse());
    const targetDatabase = migrationRequest().targetDatabase;

    await exportMigration('migration-1', { format, expectedState: 'awaiting_external_apply', targetDatabase });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/config/deployment/metadata-migrations/migration-1/export',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ format, expectedState: 'awaiting_external_apply', targetDatabase })
      })
    );
  });

  it('normalizes a stable failure without retaining raw or secret response evidence', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({ errorCode: 'operation_conflict', password: 'private-server-secret', detail: 'jdbc private' }, 409)
    );

    let error: unknown;
    try {
      await startMigration(migrationRequest());
    } catch (reason) {
      error = reason;
    }

    expect(error).toMatchObject({
      name: 'DeploymentRequestError',
      kind: 'http',
      status: 409,
      errorCode: 'operation_conflict'
    });
    expect(JSON.stringify(error)).not.toContain('private');
  });

  it('rejects malformed response contracts and preserves AbortError identity', async () => {
    apiFetch.mockResolvedValueOnce(jsonResponse({ ...deploymentFixture(), password: 'private' }));
    await expect(loadDeployment()).rejects.toMatchObject({ kind: 'contract' });

    const aborted = new DOMException('aborted', 'AbortError');
    apiFetch.mockRejectedValueOnce(aborted);
    await expect(loadMigration('migration-1')).rejects.toBe(aborted);
  });

  it('rejects an operation response whose identity does not match the requested operation', async () => {
    apiFetch
      .mockResolvedValueOnce(jsonResponse(migrationFixture({ operationId: 'operation-b' })))
      .mockResolvedValueOnce(jsonResponse(migrationFixture({ operationId: 'operation-b' })));

    await expect(loadMigration('operation-a')).rejects.toMatchObject({ kind: 'contract' });
    await expect(activateMigration('operation-a', { expectedState: 'ready_to_activate' })).rejects.toMatchObject({
      kind: 'contract'
    });
  });

  it('rejects a start response whose operation identity cannot be persisted safely', async () => {
    apiFetch.mockResolvedValue(jsonResponse(migrationFixture({ operationId: '../../unsafe' })));

    await expect(startMigration(migrationRequest())).rejects.toMatchObject({ kind: 'contract' });
  });

  it.each([
    [
      'missing no-store',
      { 'Content-Disposition': 'attachment; filename="safe.yml"', 'Content-Type': 'application/yaml' }
    ],
    [
      'unsafe filename',
      {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'attachment; filename="../private.yml"',
        'Content-Type': 'application/yaml'
      }
    ],
    [
      'invalid media type',
      {
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="safe.yml"',
        'Content-Type': 'application'
      }
    ],
    [
      'lookalike no-store extension',
      {
        'Cache-Control': 'public, x-no-store',
        'Content-Disposition': 'attachment; filename="safe.yml"',
        'Content-Type': 'application/yaml'
      }
    ],
    [
      'conditional no-store lookalike',
      {
        'Cache-Control': 'public, no-store-if-error',
        'Content-Disposition': 'attachment; filename="safe.yml"',
        'Content-Type': 'application/yaml'
      }
    ]
  ])('rejects an attachment with %s', async (_label, headers) => {
    apiFetch.mockResolvedValue(new Response('opaque', { status: 200, headers }));

    await expect(
      exportMigration('migration-1', {
        format: 'yaml',
        expectedState: 'awaiting_external_apply',
        targetDatabase: migrationRequest().targetDatabase
      })
    ).rejects.toMatchObject({ name: 'DeploymentRequestError', kind: 'contract' });
  });
});

function migrationRequest() {
  return {
    target: 'mysql' as const,
    targetDatabase: {
      kind: 'mysql' as const,
      jdbcUrl: 'jdbc:mysql://db/hertzbeat',
      username: 'hertzbeat',
      password: 'request-secret'
    },
    applyMode: 'managed_write' as const
  };
}

function deploymentFixture() {
  return {
    observedAt: '2026-08-09T01:00:00Z',
    managementDatabase: { kind: 'h2', configured: true, source: 'ui_managed', restartRequired: false },
    greptimeDatabase: { kind: 'greptime', configured: true, source: 'environment', restartRequired: false },
    applyMode: 'managed_write',
    maintenanceMode: 'active',
    topology: 'single_node',
    migration: { allowed: true, blockedBy: null, maintenanceAdmission: 'use_current', activeOperationId: null }
  };
}

function validationFixture() {
  return { valid: true, observedAt: '2026-08-09T01:00:00Z', errorCode: null, warnings: [] };
}

function migrationFixture(overrides: Record<string, unknown> = {}) {
  return {
    operationId: 'migration-1',
    state: 'ready_to_activate',
    source: 'h2',
    target: 'mysql',
    stage: 'ready_to_activate',
    progressPercent: 100,
    createdAt: '2026-08-09T01:00:00Z',
    startedAt: '2026-08-09T01:00:01Z',
    completedAt: null,
    verificationState: 'succeeded',
    errorCode: null,
    nextPollAfterMillis: 0,
    activationAvailable: true,
    restartRequired: false,
    externalApplyRequired: false,
    ...overrides
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function attachmentResponse() {
  return new Response('opaque', {
    status: 200,
    headers: {
      'Cache-Control': 'private; field="authorization", NO-STORE, max-age=0',
      'Content-Disposition': 'attachment; filename="hertzbeat-deployment.yml"',
      'Content-Type': 'application/yaml'
    }
  });
}
