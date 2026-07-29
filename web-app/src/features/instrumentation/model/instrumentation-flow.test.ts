/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import {
  applicationQuestionOptions,
  answerApplicationQuestion,
  buildDetectionRequest,
  buildQueryJump,
  buildRenderRequest,
  draftReady,
  materializeBlock,
  previousApplicationSelection,
  selectSource,
  selectedRecipePlatforms
} from './instrumentation-flow';
import type { CatalogResponse } from './instrumentation-v2-contract';

describe('instrumentation v2 flow', () => {
  it('skips application dimensions for quick start and existing OpenTelemetry', () => {
    expect(selectSource(catalog, 'quick_start')).toMatchObject({
      sourceId: 'quick_start',
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen'
    });
    expect(selectSource(catalog, 'opentelemetry_collector')).toMatchObject({
      sourceId: 'opentelemetry_collector',
      sourceKind: 'existing_opentelemetry',
      recipeId: 'existing_otlp'
    });
  });

  it('asks only source-scoped unresolved application dimensions', () => {
    const start = selectSource(catalog, 'java');
    expect(start).toMatchObject({ sourceId: 'java', sourceKind: 'application', language: 'java' });
    expect(applicationQuestionOptions(catalog, start, 'framework')).toEqual(['spring_boot', 'java_jar']);
    expect(applicationQuestionOptions(catalog, start, 'method')).toEqual([]);
    const spring = answerApplicationQuestion(start, catalog, 'framework', 'spring_boot');
    expect(spring).toMatchObject({ language: 'java', framework: 'spring_boot' });
    expect(spring.recipeId).toBeUndefined();
    expect(spring.environment).toBeUndefined();
    expect(applicationQuestionOptions(catalog, spring, 'environment')).toEqual(['docker', 'kubernetes']);
    expect(answerApplicationQuestion(spring, catalog, 'environment', 'docker')).toMatchObject({
      environment: 'docker',
      recipeId: 'java_spring'
    });
    const jar = answerApplicationQuestion(start, catalog, 'framework', 'java_jar');
    expect(jar).toMatchObject({ language: 'java', framework: 'java_jar' });
    expect(jar.recipeId).toBe('java_jar_sdk');
  });

  it('steps back through application choices before returning to the source directory', () => {
    const start = selectSource(catalog, 'java');
    const spring = answerApplicationQuestion(start, catalog, 'framework', 'spring_boot');
    const docker = answerApplicationQuestion(spring, catalog, 'environment', 'docker');

    const beforeEnvironment = previousApplicationSelection(docker, catalog);
    expect(beforeEnvironment).toMatchObject({
      sourceId: 'java',
      framework: 'spring_boot'
    });
    expect(beforeEnvironment).not.toHaveProperty('environment');
    expect(beforeEnvironment).not.toHaveProperty('recipeId');
    const beforeFramework = previousApplicationSelection(spring, catalog);
    expect(beforeFramework).toMatchObject({ sourceId: 'java' });
    expect(beforeFramework).not.toHaveProperty('framework');
    expect(beforeFramework).not.toHaveProperty('recipeId');
    expect(previousApplicationSelection(start, catalog).sourceId).toBeUndefined();
  });

  it('blocks unsupported catalog entries from selection', () => {
    expect(() => selectSource(catalog, 'fluent_bit')).toThrow('Instrumentation source is unavailable');
  });

  it('preserves the complete service identity for render and detection', () => {
    const start = selectSource(catalog, 'java');
    const spring = answerApplicationQuestion(start, catalog, 'framework', 'spring_boot');
    const docker = answerApplicationQuestion(spring, catalog, 'environment', 'docker');
    const service = {
      name: 'checkout',
      namespace: 'payments',
      environment: 'production',
      serviceInstanceId: 'checkout-7d9',
      endpoint: '/checkout'
    };
    const draft = { ...docker, intakeProfileId: 'server-default', service };

    expect(buildRenderRequest(draft).service).toEqual(service);
    expect(buildDetectionRequest(draft, 1000)).toMatchObject({ startedAt: 1000, service });
    expect(JSON.stringify(buildRenderRequest(draft))).not.toContain('token');
    expect(JSON.stringify(buildDetectionRequest(draft, 1000))).not.toContain('token');
  });

  it('keeps the complete service identity through source, application answer, and Back transitions', () => {
    const service = {
      name: 'checkout',
      namespace: 'payments',
      environment: 'production',
      serviceInstanceId: 'checkout-7d9',
      endpoint: '/checkout'
    };
    const start = selectSource(catalog, 'java', service);
    const spring = answerApplicationQuestion(start, catalog, 'framework', 'spring_boot');
    const docker = answerApplicationQuestion(spring, catalog, 'environment', 'docker');

    expect(start.service).toEqual(service);
    expect(spring.service).toEqual(service);
    expect(docker.service).toEqual(service);
    expect(previousApplicationSelection(docker, catalog).service).toEqual(service);
    expect(selectSource(catalog, 'quick_start', service).service).toEqual(service);
  });

  it('requires the primary service scope while allowing empty optional identity fields', () => {
    const selected = selectSource(catalog, 'quick_start');
    const complete = {
      ...selected,
      intakeProfileId: 'server-default',
      service: {
        name: 'checkout',
        namespace: 'payments',
        environment: 'production',
        serviceInstanceId: ' checkout-7d9 ',
        endpoint: ' /checkout '
      }
    };
    const cleared = {
      ...complete,
      service: { ...complete.service, serviceInstanceId: '', endpoint: '' }
    };

    expect(draftReady(complete)).toBe(true);
    expect(buildRenderRequest(complete).service).toEqual({
      name: 'checkout',
      namespace: 'payments',
      environment: 'production',
      serviceInstanceId: 'checkout-7d9',
      endpoint: '/checkout'
    });
    expect(buildRenderRequest(cleared).service).toEqual({
      name: 'checkout',
      namespace: 'payments',
      environment: 'production'
    });
    expect(draftReady({ ...complete, service: { ...complete.service, namespace: ' ' } })).toBe(false);
    expect(draftReady({ ...complete, service: { ...complete.service, environment: ' ' } })).toBe(false);
  });

  it('resolves the recipe before platform selection and exposes platforms for Configure', () => {
    const multiPlatformCatalog = {
      ...catalog,
      recipes: catalog.recipes.map(recipe =>
        recipe.id === 'java_spring' ? { ...recipe, platforms: ['linux_amd64', 'linux_arm64'] } : recipe
      )
    };
    const start = selectSource(multiPlatformCatalog, 'java');
    const spring = answerApplicationQuestion(start, multiPlatformCatalog, 'framework', 'spring_boot');
    const docker = answerApplicationQuestion(spring, multiPlatformCatalog, 'environment', 'docker');

    expect(docker.recipeId).toBe('java_spring');
    expect(docker.platform).toBeUndefined();
    expect(selectedRecipePlatforms(multiPlatformCatalog, docker)).toEqual(['linux_amd64', 'linux_arm64']);
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

  it('does not invent a metric name that detection did not return', () => {
    const href = buildQueryJump('metrics', {
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

    expect(new URL(href, 'http://localhost').searchParams.has('query')).toBe(false);
  });
});

const catalog = {
  schemaVersion: 2,
  groups: [
    { id: 'quick_start', labelKey: 'instrumentation.v2.directory.group.quick_start' },
    { id: 'applications', labelKey: 'instrumentation.v2.directory.group.applications' },
    { id: 'collectors', labelKey: 'instrumentation.v2.directory.group.collectors' },
    { id: 'logs', labelKey: 'instrumentation.v2.directory.group.logs' }
  ],
  sources: [
    source('quick_start', ['quick_start'], 'quick_start', ['opentelemetry_telemetrygen']),
    source('java', ['applications'], 'application', ['java_spring', 'java_jar_sdk']),
    source('opentelemetry_collector', ['collectors'], 'existing_opentelemetry', ['existing_otlp']),
    {
      ...source('fluent_bit', ['logs'], 'existing_opentelemetry', []),
      support: 'unsupported',
      sourceKind: undefined,
      signals: { metrics: 'unsupported', logs: 'unsupported', traces: 'unsupported' }
    }
  ],
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
      environments: ['docker', 'kubernetes'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
      components: [],
      blocksPreview: ['environment']
    },
    {
      id: 'java_jar_sdk',
      kind: 'application',
      labelKey: 'instrumentation.v2.recipe.java_jar_sdk',
      preview: false,
      language: 'java',
      framework: 'java_jar',
      method: 'sdk',
      environments: ['vm'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
      components: [],
      blocksPreview: ['environment']
    },
    {
      id: 'node_express',
      kind: 'application',
      labelKey: 'instrumentation.v2.recipe.node_express',
      preview: false,
      language: 'nodejs',
      framework: 'express',
      method: 'zero_code',
      environments: ['docker'],
      platforms: ['linux_amd64'],
      signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
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

function source(
  id: string,
  groupIds: string[],
  sourceKind: 'quick_start' | 'application' | 'existing_opentelemetry',
  recipeIds: string[]
) {
  return {
    id,
    labelKey: `instrumentation.v2.directory.source.${id}`,
    descriptionKey: `instrumentation.v2.directory.source.${id}_description`,
    iconKey: id.replaceAll('_', '-'),
    groupIds,
    support: 'supported' as const,
    sourceKind,
    recipeIds,
    signals: { metrics: 'supported' as const, logs: 'supported' as const, traces: 'supported' as const }
  };
}
