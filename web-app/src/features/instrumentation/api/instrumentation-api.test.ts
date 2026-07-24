/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/http-client', () => ({ apiFetch }));

import { loadInstrumentationCatalog, loadIntakeProfiles, renderInstrumentationGuide } from './instrumentation-api';

describe('instrumentation v2 API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses only the frozen v2 read endpoints', async () => {
    apiFetch
      .mockResolvedValueOnce(
        response({
          schemaVersion: 2,
          sources: [
            {
              kind: 'quick_start',
              labelKey: 'instrumentation.v2.source.quick_start',
              descriptionKey: 'instrumentation.v2.source.quick_start_description'
            },
            {
              kind: 'application',
              labelKey: 'instrumentation.v2.source.application',
              descriptionKey: 'instrumentation.v2.source.application_description'
            },
            {
              kind: 'existing_opentelemetry',
              labelKey: 'instrumentation.v2.source.existing_opentelemetry',
              descriptionKey: 'instrumentation.v2.source.existing_opentelemetry_description'
            }
          ],
          recipes: []
        })
      )
      .mockResolvedValueOnce(response({ schemaVersion: 2, status: 'unconfigured', profiles: [] }));
    await loadInstrumentationCatalog();
    await loadIntakeProfiles();
    expect(apiFetch.mock.calls.map(call => call[0])).toEqual([
      '/api/instrumentation/v2/catalog',
      '/api/instrumentation/v2/intake-profiles'
    ]);
  });

  it('allowlists render fields so a memory-only token cannot enter transport', async () => {
    apiFetch.mockResolvedValueOnce(response(renderFixture()));
    await renderInstrumentationGuide({
      schemaVersion: 2,
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen',
      intakeProfileId: 'server-default',
      service: { name: 'checkout', namespace: 'shop', environment: 'prod' },
      token: 'must-never-leave-memory'
    } as never);
    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe('/api/instrumentation/v2/render');
    expect(String(init.body)).not.toContain('must-never-leave-memory');
    expect(JSON.parse(String(init.body))).not.toHaveProperty('token');
  });
});

function response(data: unknown) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
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
