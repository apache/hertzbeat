/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/http-client', () => ({ apiFetch }));

import {
  detectInstrumentationSignals,
  InstrumentationContractError,
  loadInstrumentationCatalog,
  loadIntakeProfiles,
  renderInstrumentationGuide
} from './instrumentation-api';

describe('instrumentation API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses only the frozen public read endpoints', async () => {
    apiFetch
      .mockResolvedValueOnce(
        response({
          schemaVersion: 2,
          groups: [{ id: 'quick_start', labelKey: 'instrumentation.v2.directory.group.quick_start' }],
          sources: [
            {
              id: 'quick_start',
              labelKey: 'instrumentation.v2.directory.source.quick_start',
              descriptionKey: 'instrumentation.v2.directory.source.quick_start_description',
              iconKey: 'quick-start',
              groupIds: ['quick_start'],
              support: 'supported',
              sourceKind: 'quick_start',
              recipeIds: ['opentelemetry_telemetrygen'],
              signals: { metrics: 'supported', logs: 'supported', traces: 'supported' }
            }
          ],
          recipes: [
            {
              id: 'opentelemetry_telemetrygen',
              kind: 'quick_start',
              labelKey: 'instrumentation.v2.recipe.telemetrygen',
              preview: false,
              environments: ['docker'],
              platforms: ['linux_amd64'],
              signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
              components: [],
              blocksPreview: ['command']
            }
          ]
        })
      )
      .mockResolvedValueOnce(response({ schemaVersion: 2, status: 'unconfigured', profiles: [] }));
    await loadInstrumentationCatalog();
    await loadIntakeProfiles();
    expect(apiFetch.mock.calls.map(call => String(call[0]))).toEqual([
      '/api/instrumentation/catalog',
      '/api/instrumentation/intake-profiles'
    ]);
  });

  it('allowlists render fields so a memory-only token cannot enter transport', async () => {
    const request = {
      schemaVersion: 2,
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen',
      intakeProfileId: 'server-default',
      service: { name: 'checkout', namespace: 'shop', environment: 'prod' }
    } as const;
    apiFetch.mockResolvedValueOnce(response(renderFixture()));
    await renderInstrumentationGuide({ ...request, token: 'must-never-leave-memory' } as never);
    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe('/api/instrumentation/render');
    expect(String(init.body)).not.toContain('must-never-leave-memory');
    const serializedRequest: unknown = JSON.parse(String(init.body));
    expect(serializedRequest).not.toHaveProperty('token');

    apiFetch.mockResolvedValueOnce(response(detectionFixture()));
    await detectInstrumentationSignals({ ...request, startedAt: 1_000 });
    expect(apiFetch.mock.calls[1]?.[0]).toBe('/api/instrumentation/detect');
  });

  it('rejects mismatched response context with a stable non-sensitive contract error', async () => {
    apiFetch.mockResolvedValueOnce(response({ ...renderFixture(), recipeId: 'other-recipe' }));
    const promise = renderInstrumentationGuide({
      schemaVersion: 2,
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen',
      intakeProfileId: 'server-default',
      service: { name: 'checkout', namespace: 'shop', environment: 'prod' }
    });
    await expect(promise).rejects.toBeInstanceOf(InstrumentationContractError);
    await expect(promise).rejects.not.toHaveProperty('cause');
  });
});

function response(data: unknown) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function detectionFixture() {
  const context = {
    serviceName: 'checkout',
    serviceNamespace: 'shop',
    environment: 'prod',
    intakeProfileId: 'server-default',
    startedAt: 1_000,
    detectedAt: 2_000
  };
  return {
    schemaVersion: 2,
    detectedAt: 2_000,
    context: {
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen',
      service: { name: 'checkout', namespace: 'shop', environment: 'prod' },
      intakeProfileId: 'server-default',
      startedAt: 1_000,
      windowEndAt: 3_000
    },
    signals: {
      metrics: { status: 'received', lastReceivedAt: 1_900 },
      logs: { status: 'waiting', errorCode: 'signal_not_received' },
      traces: { status: 'unsupported', errorCode: 'signal_not_supported' }
    },
    polling: { decision: 'complete', deadlineAt: 3_000 },
    queryJumpContext: context,
    queryJumps: [
      { signal: 'metrics', enabled: true, context },
      { signal: 'logs', enabled: false, context },
      { signal: 'traces', enabled: false, context }
    ]
  };
}

function renderFixture() {
  return {
    schemaVersion: 2,
    sourceKind: 'quick_start',
    recipeId: 'opentelemetry_telemetrygen',
    intakeProfile: {
      id: 'server-default',
      kind: 'server',
      availability: 'available',
      gateway: 'server',
      supportedTransports: ['http_protobuf'],
      httpsEndpoints: { http_protobuf: 'https://example.test/otlp' },
      authHeaderName: 'Authorization'
    },
    service: { name: 'checkout', namespace: 'shop', environment: 'prod' },
    signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
    components: [],
    secretPlaceholders: {
      authorizationToken: { marker: '${HERTZBEAT_TOKEN}', kind: 'authorization_token' }
    },
    blocks: [
      {
        id: 'send',
        type: 'command',
        titleKey: 'instrumentation.v2.block.send_metrics',
        executionLocationKey: 'instrumentation.location.application_host',
        language: 'shell',
        content: 'token=${HERTZBEAT_TOKEN}',
        placeholders: ['authorizationToken']
      }
    ]
  };
}
