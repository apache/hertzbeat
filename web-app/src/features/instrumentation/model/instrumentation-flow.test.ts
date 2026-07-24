/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import { buildQueryJump, materializeBlock, recipeDimensions, selectSource } from './instrumentation-flow';
import type { CatalogResponse } from './instrumentation-v2-contract';

describe('instrumentation v2 flow', () => {
  it('skips application dimensions for quick start and existing OpenTelemetry', () => {
    expect(selectSource(catalog, 'quick_start')).toMatchObject({
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen'
    });
    expect(selectSource(catalog, 'existing_opentelemetry')).toMatchObject({
      sourceKind: 'existing_opentelemetry',
      recipeId: 'existing_otlp'
    });
  });

  it('derives application options only from backend recipes', () => {
    expect(recipeDimensions(catalog.recipes.filter(recipe => recipe.kind === 'application'))).toEqual({
      languages: ['java'],
      frameworks: ['spring_boot'],
      methods: ['zero_code'],
      environments: ['docker'],
      platforms: ['linux_amd64']
    });
  });

  it('materializes the secret only at copy time and validates it first', () => {
    expect(materializeBlock('token=${HERTZBEAT_TOKEN}', ['authorizationToken'], 'valid-token-123')).toBe(
      'token=valid-token-123'
    );
    expect(() => materializeBlock('token=${HERTZBEAT_TOKEN}', ['authorizationToken'], 'bad token')).toThrow();
    expect(() => materializeBlock('token=${HERTZBEAT_TOKEN}', ['authorizationToken'], 'unsafe/token')).toThrow();
  });

  it('preserves the backend query jump profile and exact window', () => {
    const href = buildQueryJump('logs', {
      serviceName: 'checkout',
      serviceNamespace: 'shop',
      environment: 'prod',
      intakeProfileId: 'server-default',
      collectorId: 'edge',
      serviceInstanceId: 'checkout-1',
      endpoint: '/checkout',
      startedAt: 1000,
      detectedAt: 2000
    });
    expect(Object.fromEntries(new URL(href, 'http://localhost').searchParams)).toMatchObject({
      signal: 'logs',
      intakeProfileId: 'server-default',
      collectorId: 'edge',
      start: '1000',
      end: '2000'
    });
  });
});

const catalog = {
  schemaVersion: 2,
  sources: [],
  recipes: [
    {
      id: 'opentelemetry_telemetrygen',
      kind: 'quick_start',
      labelKey: 'instrumentation.v2.recipe.opentelemetry_telemetrygen',
      preview: false,
      environments: ['docker'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
      components: [],
      blocksPreview: ['command']
    },
    {
      id: 'java_spring',
      kind: 'application',
      labelKey: 'instrumentation.v2.recipe.java_spring',
      preview: false,
      language: 'java',
      framework: 'spring_boot',
      method: 'zero_code',
      environments: ['docker'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
      components: [],
      blocksPreview: ['environment']
    },
    {
      id: 'existing_otlp',
      kind: 'existing_opentelemetry',
      labelKey: 'instrumentation.v2.recipe.existing_otlp',
      preview: false,
      environments: [],
      platforms: [],
      signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
      components: [],
      blocksPreview: ['code']
    }
  ]
} satisfies CatalogResponse;
