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

import { describe, expect, it } from 'vitest';

import type { CatalogResponse, OfficialComponent, QueryJumpContext } from './instrumentation-contract';
import {
  createFlowDraft,
  reconcileFlowCatalog,
  selectCatalogLanguage,
  updateFlowContext,
  validateFlowContext,
  type InstrumentationFlowDraft
} from './instrumentation-flow';
import {
  buildDetectionRequest,
  buildExploreHandoff,
  buildGuideRequest,
  createTransientCollectorTarget
} from './instrumentation-requests';

describe('instrumentation onboarding flow model', () => {
  it('chooses the stable catalog method and never invents a language-specific method', () => {
    const draft = selectCatalogLanguage(createFlowDraft(), catalog, 'go');

    expect(draft.selection).toMatchObject({ language: 'go', framework: 'go_generic', method: 'sdk' });
    expect(() => selectCatalogLanguage(draft, catalog, 'php')).toThrow(/php/);
  });

  it('preserves a compatible selection and normalizes one removed by a refreshed catalog', () => {
    const previewDraft = {
      ...configuredDraft(),
      environment: 'kubernetes' as const,
      selection: {
        ...configuredDraft().selection!,
        method: 'ebpf' as const,
        environment: 'kubernetes' as const
      }
    };
    expect(reconcileFlowCatalog(previewDraft, catalog).selection?.method).toBe('ebpf');

    const refreshedCatalog = {
      ...catalog,
      languages: catalog.languages.map(language => ({
        ...language,
        frameworks: language.frameworks.map(framework => ({
          ...framework,
          methods: framework.methods.filter(method => method.method !== 'ebpf')
        }))
      }))
    };
    expect(reconcileFlowCatalog(previewDraft, refreshedCatalog).selection?.method).toBe('sdk');
  });

  it('builds allowlisted render and detection requests from the same scoped context', () => {
    const draft = configuredDraft();
    const render = buildGuideRequest(draft, collector, transientTarget);
    const detection = buildDetectionRequest(draft, 1_710_000_000_000);

    expect(render).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        collector: expect.objectContaining({ collectorId: 'collector-east' }),
        service: {
          name: 'checkout-api',
          namespace: 'commerce',
          environment: 'prod',
          serviceInstanceId: 'checkout-7d9',
          endpoint: '/checkout'
        }
      })
    );
    expect(detection).toEqual(
      expect.objectContaining({
        collectorId: 'collector-east',
        startedAt: 1_710_000_000_000,
        service: render.service
      })
    );
    expect(JSON.stringify(render)).not.toContain('hb_memory_only');
    expect(JSON.stringify(detection)).not.toContain('hb_memory_only');
  });

  it('blocks rendering without an explicitly supplied transient intake target', () => {
    const draft = configuredDraft();

    expect(() => buildGuideRequest(draft, collector)).toThrow(/intake/i);
    expect(() =>
      createTransientCollectorTarget({
        collectorId: 'collector-east',
        otlpHttpEndpoint: null,
        otlpGrpcEndpoint: null,
        authorizationHeader: 'Authorization'
      })
    ).toThrow(/intake/i);
    expect(() =>
      createTransientCollectorTarget({
        collectorId: 'collector-east',
        otlpHttpEndpoint: 'http://token@collector.internal:4318',
        otlpGrpcEndpoint: 'http://collector.internal:4317',
        authorizationHeader: 'Authorization'
      })
    ).toThrow(/endpoint/i);
    expect(() =>
      createTransientCollectorTarget({
        collectorId: 'collector-east',
        otlpHttpEndpoint: '',
        otlpGrpcEndpoint: 'http://collector.internal:4317',
        authorizationHeader: 'Authorization'
      })
    ).toThrow(/endpoint/i);
  });

  it('requires complete service and Collector context before rendering', () => {
    expect(validateFlowContext(createFlowDraft())).toEqual(
      expect.arrayContaining(['collectorId', 'serviceName', 'serviceNamespace', 'serviceEnvironment'])
    );
  });

  it('builds a received-only Explore handoff with the full scope and no token', () => {
    const href = buildExploreHandoff('logs', jumpContext);
    const url = new URL(href, 'http://localhost');

    expect(url.pathname).toBe('/explore');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      signal: 'logs',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      collectorId: 'collector-east',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      start: String(jumpContext.startedAt),
      end: String(jumpContext.detectedAt)
    });
    expect(href).not.toContain('token');
  });
});

const component: OfficialComponent = {
  name: 'OpenTelemetry Go SDK',
  sourceUrl: 'https://opentelemetry.io/',
  version: '1.43.0',
  versionPolicy: 'pinned',
  license: 'Apache-2.0',
  installationLocationKey: 'instrumentation.location.application_host',
  official: true,
  bundledWithHertzBeat: false,
  dependencies: [],
  artifacts: []
};

const catalog: CatalogResponse = {
  schemaVersion: 1,
  languages: [
    {
      language: 'go',
      labelKey: 'instrumentation.language.go',
      frameworks: [
        {
          framework: 'go_generic',
          labelKey: 'instrumentation.framework.go_generic',
          methods: [
            {
              method: 'ebpf',
              labelKey: 'instrumentation.method.ebpf',
              preview: true,
              environments: ['kubernetes'],
              platforms: ['linux_amd64'],
              signals: { metrics: 'unsupported', logs: 'unsupported', traces: 'preview' },
              component
            },
            {
              method: 'sdk',
              labelKey: 'instrumentation.method.sdk',
              preview: false,
              environments: ['vm', 'docker', 'kubernetes'],
              platforms: ['linux_amd64', 'any'],
              signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
              component
            }
          ]
        }
      ]
    }
  ]
};

const collector = {
  collectorId: 'collector-east',
  name: 'collector-east',
  online: true,
  address: '10.0.0.8',
  intake: { status: 'unavailable' as const, errorCode: 'intake_not_advertised' as const }
};

const transientTarget = createTransientCollectorTarget({
  collectorId: 'collector-east',
  otlpHttpEndpoint: 'http://collector.internal:4318',
  otlpGrpcEndpoint: 'http://collector.internal:4317',
  authorizationHeader: 'Authorization'
});

function configuredDraft() {
  let draft: InstrumentationFlowDraft = selectCatalogLanguage(createFlowDraft(), catalog, 'go');
  draft = { ...draft, serviceInstanceId: 'checkout-7d9', endpoint: '/checkout' };
  draft = updateFlowContext(draft, 'collectorId', collector.collectorId);
  draft = updateFlowContext(draft, 'serviceName', 'checkout-api');
  draft = updateFlowContext(draft, 'serviceNamespace', 'commerce');
  return updateFlowContext(draft, 'serviceEnvironment', 'prod');
}

const jumpContext: QueryJumpContext = {
  serviceName: 'checkout-api',
  serviceNamespace: 'commerce',
  environment: 'prod',
  collectorId: 'collector-east',
  serviceInstanceId: 'checkout-7d9',
  endpoint: '/checkout',
  startedAt: 1_710_000_000_000,
  detectedAt: 1_710_000_005_000
};
