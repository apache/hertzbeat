/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/http-client', () => ({ apiFetch }));

import {
  detectInstrumentationSignals,
  InstrumentationContractError,
  InstrumentationRequestError,
  loadInstrumentationCatalog,
  renderInstrumentationGuide
} from './instrumentation-api';
import type { DetectionRequest, GuideRenderRequest } from '../model/instrumentation-contract';

const selection = {
  language: 'nodejs',
  framework: 'express',
  method: 'zero_code',
  environment: 'docker',
  platform: 'linux_amd64'
} as const;
const service = { name: 'checkout-api', namespace: 'commerce', environment: 'prod' };
const context = {
  serviceName: service.name,
  serviceNamespace: service.namespace,
  environment: service.environment,
  collectorId: 'collector-east',
  startedAt: 1_710_000_000_000,
  detectedAt: 1_710_000_005_000
};

describe('instrumentation v1 API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls only the versioned catalog endpoint', async () => {
    apiFetch.mockResolvedValueOnce(messageResponse({ schemaVersion: 1, languages: [] }));

    await expect(loadInstrumentationCatalog()).resolves.toEqual({ schemaVersion: 1, languages: [] });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/instrumentation/v1/catalog',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('renders through an allowlisted body that cannot carry a token', async () => {
    apiFetch.mockResolvedValueOnce(
      messageResponse({
        schemaVersion: 1,
        selection,
        signals: { metrics: 'supported', logs: 'unsupported', traces: 'supported' },
        component: componentFixture(),
        secretPlaceholders: {},
        steps: []
      })
    );
    const request = {
      schemaVersion: 1,
      ...selection,
      collector: {
        collectorId: context.collectorId,
        otlpHttpEndpoint: 'http://collector.internal:4318',
        otlpGrpcEndpoint: 'http://collector.internal:4317',
        authorizationHeader: 'Authorization'
      },
      service,
      token: 'must-not-leave-memory'
    } as GuideRenderRequest & { token: string };

    await renderInstrumentationGuide(request);

    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe('/api/instrumentation/v1/render');
    expect(path).not.toContain('must-not-leave-memory');
    expect(JSON.parse(String(init.body))).toEqual(expect.not.objectContaining({ token: expect.anything() }));
  });

  it('detects through an allowlisted body and parses typed polling and jumps', async () => {
    apiFetch.mockResolvedValueOnce(messageResponse(detectionFixture()));
    const request = {
      schemaVersion: 1,
      ...selection,
      service,
      collectorId: context.collectorId,
      startedAt: context.startedAt,
      token: 'must-not-leave-memory'
    } as DetectionRequest & { token: string };

    const response = await detectInstrumentationSignals(request);

    expect(response.polling.decision).toBe('complete');
    expect(response.queryJumps.map(jump => jump.signal)).toEqual(['metrics', 'logs', 'traces']);
    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe('/api/instrumentation/v1/detect');
    expect(path).not.toContain('must-not-leave-memory');
    expect(JSON.parse(String(init.body))).toEqual(expect.not.objectContaining({ token: expect.anything() }));
  });

  it('rejects a render response that echoes another selection', async () => {
    apiFetch.mockResolvedValueOnce(
      messageResponse({
        schemaVersion: 1,
        selection: { ...selection, framework: 'nodejs' },
        signals: { metrics: 'supported', logs: 'unsupported', traces: 'supported' },
        component: componentFixture(),
        secretPlaceholders: {},
        steps: []
      })
    );

    await expect(renderInstrumentationGuide(renderRequest())).rejects.toBeInstanceOf(InstrumentationContractError);
  });

  it('rejects detection data scoped to another onboarding attempt', async () => {
    const fixture = detectionFixture();
    fixture.context.collectorId = 'collector-west';
    apiFetch.mockResolvedValueOnce(messageResponse(fixture));

    await expect(detectInstrumentationSignals(detectionRequest())).rejects.toBeInstanceOf(InstrumentationContractError);
  });

  it('surfaces the three stable machine request errors', async () => {
    for (const code of [
      'instrumentation_schema_unsupported',
      'instrumentation_selection_invalid',
      'instrumentation_context_invalid'
    ] as const) {
      apiFetch.mockResolvedValueOnce(messageResponse(null, 1, code));
      let error: unknown;
      try {
        await loadInstrumentationCatalog();
      } catch (reason: unknown) {
        error = reason;
      }
      expect(error).toBeInstanceOf(InstrumentationRequestError);
      expect((error as InstrumentationRequestError).machineCode).toBe(code);
    }
  });
});

function messageResponse(data: unknown, code = 0, msg = '') {
  return new Response(JSON.stringify({ code, msg, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function componentFixture() {
  return {
    name: 'Node instrumentation',
    sourceUrl: 'https://example.test/node',
    version: '1.0.0',
    versionPolicy: 'pinned',
    license: 'Apache-2.0',
    installationLocationKey: 'instrumentation.location.application_host',
    official: true,
    bundledWithHertzBeat: false,
    dependencies: [],
    artifacts: []
  };
}

function detectionFixture() {
  return {
    schemaVersion: 1,
    detectedAt: context.detectedAt,
    context: {
      schemaVersion: 1,
      ...selection,
      service,
      collectorId: context.collectorId,
      startedAt: context.startedAt
    },
    signals: {
      metrics: { status: 'received', lastReceivedAt: context.detectedAt, errorCode: null },
      logs: { status: 'unsupported', lastReceivedAt: null, errorCode: 'signal_not_supported' },
      traces: { status: 'received', lastReceivedAt: context.detectedAt, errorCode: null }
    },
    polling: { decision: 'complete', pollAfterMs: null, deadlineAt: context.startedAt + 120_000 },
    queryJumpContext: context,
    queryJumps: [
      { signal: 'metrics', enabled: true, context },
      { signal: 'logs', enabled: false, context },
      { signal: 'traces', enabled: true, context }
    ]
  };
}

function renderRequest(): GuideRenderRequest {
  return {
    schemaVersion: 1,
    ...selection,
    collector: {
      collectorId: context.collectorId,
      otlpHttpEndpoint: 'http://collector.internal:4318',
      otlpGrpcEndpoint: 'http://collector.internal:4317',
      authorizationHeader: 'Authorization'
    },
    service
  };
}

function detectionRequest(): DetectionRequest {
  return {
    schemaVersion: 1,
    ...selection,
    service,
    collectorId: context.collectorId,
    startedAt: context.startedAt
  };
}
