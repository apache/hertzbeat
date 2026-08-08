/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/core/http/http-client', () => ({ apiFetch }));

import {
  configureSetup,
  exportSetupConfiguration,
  loadSetupOperation,
  loadSetupStatus,
  unlockSetup,
  validateSetupSection
} from './setup-api';

describe('setup API', () => {
  beforeEach(() => apiFetch.mockReset());

  it('loads canonical status with cookie credentials and no cache', async () => {
    apiFetch.mockResolvedValue(jsonResponse(statusFixture()));

    await expect(loadSetupStatus()).resolves.toMatchObject({ phase: 'configuration_required', access: 'local' });
    expect(apiFetch).toHaveBeenCalledWith('/api/setup/status', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });
  });

  it('loads an encoded operation identity without caching', async () => {
    apiFetch.mockResolvedValue(jsonResponse(operationFixture()));

    await expect(loadSetupOperation('operation/a')).resolves.toMatchObject({ operationId: 'operation/a' });
    expect(apiFetch).toHaveBeenCalledWith('/api/setup/operations/operation%2Fa', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });
  });

  it('submits the unlock code once and returns only cookie-backed access evidence', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ access: 'unlocked', expiresAt: '2026-08-08T06:10:00Z' }));

    await expect(unlockSetup('once-only')).resolves.toEqual({
      access: 'unlocked',
      expiresAt: '2026-08-08T06:10:00Z'
    });
    expect(apiFetch).toHaveBeenCalledWith('/api/setup/unlock', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'once-only' })
    });
  });

  it('classifies a 410 setup_complete response for canonical convergence', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ errorCode: 'setup_complete', observedAt: '2026-08-08T06:00:00Z' }, 410));

    await expect(unlockSetup('expired-view')).rejects.toMatchObject({
      name: 'SetupRequestError',
      status: 410,
      errorCode: 'setup_complete'
    });
  });

  it('validates exactly one metadata section with no mutation cache', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({ valid: true, observedAt: '2026-08-08T06:00:00Z', errorCode: null, warnings: [] })
    );
    const managementDatabase = {
      kind: 'postgresql' as const,
      jdbcUrl: 'jdbc:postgresql://db/hertzbeat',
      username: 'hertzbeat',
      password: 'request-only'
    };

    await validateSetupSection({ section: 'metadata_database', managementDatabase });

    expect(apiFetch).toHaveBeenCalledWith('/api/setup/validate', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'metadata_database', managementDatabase })
    });
  });

  it('submits the exact required configuration contract', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({
        operationId: 'setup-1',
        state: 'awaiting_restart',
        phase: 'application_starting',
        nextPollAfterMillis: 500,
        exportAvailable: false
      })
    );
    const configuration = configurationFixture();

    await configureSetup(configuration);

    expect(apiFetch).toHaveBeenCalledWith('/api/setup/configuration', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configuration)
    });
  });

  it('returns only safe attachment metadata and an opaque export blob', async () => {
    apiFetch.mockResolvedValue(
      new Response('secret artifact', {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="hertzbeat-setup.yml"',
          'Content-Type': 'application/yaml'
        }
      })
    );
    const request = { format: 'yaml' as const, configuration: configurationFixture() };

    const artifact = await exportSetupConfiguration(request);

    expect(artifact.fileName).toBe('hertzbeat-setup.yml');
    expect(artifact.mediaType).toBe('application/yaml');
    expect(artifact.blob).toMatchObject({ size: 15, type: 'application/yaml' });
    expect(apiFetch).toHaveBeenCalledWith('/api/setup/export', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
  });

  it('rejects unsafe export attachment metadata without reading it as text', async () => {
    apiFetch.mockResolvedValue(
      new Response('not inspected', {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="../unsafe.yml"',
          'Content-Type': 'application/yaml'
        }
      })
    );
    await expect(
      exportSetupConfiguration({ format: 'yaml', configuration: configurationFixture() })
    ).rejects.toMatchObject({ name: 'SetupRequestError', kind: 'contract' });
  });
});

function configurationFixture() {
  return {
    expectedPhase: 'configuration_required' as const,
    applyMode: 'managed_write' as const,
    managementDatabase: {
      kind: 'mysql' as const,
      jdbcUrl: 'jdbc:mysql://db/hertzbeat',
      username: 'hertzbeat',
      password: 'metadata-secret'
    },
    telemetryStore: {
      kind: 'greptime' as const,
      grpcEndpoints: 'greptime:4001',
      httpEndpoint: 'http://greptime:4000',
      database: 'public',
      username: 'greptime',
      password: 'telemetry-secret'
    }
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function statusFixture() {
  return {
    phase: 'configuration_required',
    observedAt: '2026-08-08T06:00:00Z',
    access: 'local',
    applyMode: 'managed_write',
    writableManagedConfig: true,
    operationId: null,
    errorCode: null,
    managementDatabase: { kind: 'h2', configured: false, source: 'built_in_default', restartRequired: false },
    telemetryStore: { kind: 'greptime', configured: false, source: 'built_in_default', restartRequired: false },
    administratorConfigured: false,
    optional: {
      publicAccessConfigured: false,
      serverOtlpHttpConfigured: false,
      serverOtlpGrpcConfigured: false,
      retentionConfigured: false,
      mailConfigured: false
    },
    pendingWarnings: []
  };
}

function operationFixture() {
  return {
    operationId: 'operation/a',
    state: 'running',
    phase: 'application_starting',
    createdAt: '2026-08-08T06:00:00Z',
    startedAt: '2026-08-08T06:00:01Z',
    completedAt: null,
    errorCode: null,
    nextPollAfterMillis: 500,
    exportAvailable: false
  };
}
