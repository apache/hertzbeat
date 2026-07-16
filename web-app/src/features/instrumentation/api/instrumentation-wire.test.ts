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

import type { DetectionRequest, GuideRenderRequest } from './instrumentation-contract';
import {
  buildDetectionPayload,
  buildGuideRenderPayload,
  InstrumentationContractError,
  materializeSnippetForCopy,
  parseCatalogResponse,
  parseDetectionResponse,
  parseGuideRenderResponse
} from './instrumentation-wire';

const component = {
  name: '@opentelemetry/auto-instrumentations-node',
  sourceUrl: 'https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node/v/0.78.0',
  version: '0.78.0',
  versionPolicy: 'pinned',
  license: 'Apache-2.0',
  installationLocationKey: 'instrumentation.location.application_host',
  official: true,
  bundledWithHertzBeat: false,
  dependencies: [],
  artifacts: []
};

const renderRequest: GuideRenderRequest = {
  schemaVersion: 1,
  language: 'nodejs',
  framework: 'express',
  method: 'zero_code',
  environment: 'docker',
  platform: 'linux_amd64',
  collector: {
    collectorId: 'collector-east',
    otlpHttpEndpoint: 'http://collector.internal:4318',
    otlpGrpcEndpoint: 'http://collector.internal:4317',
    authorizationHeader: 'Authorization'
  },
  service: { name: 'checkout-api', namespace: 'commerce', environment: 'prod' }
};

const detectionRequest: DetectionRequest = {
  schemaVersion: 1,
  language: 'nodejs',
  framework: 'express',
  method: 'zero_code',
  environment: 'docker',
  platform: 'linux_amd64',
  service: { name: 'checkout-api', namespace: 'commerce', environment: 'prod' },
  collectorId: 'collector-east',
  startedAt: 1_710_000_000_000
};

describe('instrumentation v1 model', () => {
  it('parses the nested catalog and rejects another schema version', () => {
    const catalog = parseCatalogResponse({
      schemaVersion: 1,
      languages: [{
        language: 'nodejs',
        labelKey: 'instrumentation.language.nodejs',
        frameworks: [{
          framework: 'express',
          labelKey: 'instrumentation.framework.express',
          methods: [{
            method: 'zero_code',
            labelKey: 'instrumentation.method.zero_code',
            preview: false,
            environments: ['vm', 'docker'],
            platforms: ['linux_amd64'],
            signals: { metrics: 'supported', logs: 'unsupported', traces: 'supported' },
            component
          }]
        }]
      }]
    });

    expect(catalog.languages[0]?.frameworks[0]?.methods[0]?.signals.logs).toBe('unsupported');
    expect(() => parseCatalogResponse({ schemaVersion: 2, languages: [] })).toThrow(InstrumentationContractError);
  });

  it('rejects any component or dependency represented as bundled by HertzBeat', () => {
    const bundledComponent = guideFixture();
    bundledComponent.component.bundledWithHertzBeat = true;
    expect(() => parseGuideRenderResponse(bundledComponent)).toThrow(InstrumentationContractError);

    const bundledDependency = guideFixture();
    (bundledDependency.component.dependencies as unknown[]).push({
      name: 'external-package', sourceUrl: 'https://example.test/package', version: '1.0.0',
      license: 'Apache-2.0', purposeKey: 'instrumentation.dependency.sdk', official: true,
      bundledWithHertzBeat: true
    });
    expect(() => parseGuideRenderResponse(bundledDependency)).toThrow(InstrumentationContractError);
  });

  it('parses structured guide secrets and replaces them only in a copy value', () => {
    const guide = parseGuideRenderResponse({
      schemaVersion: 1,
      selection: {
        language: 'nodejs',
        framework: 'express',
        method: 'zero_code',
        environment: 'docker',
        platform: 'linux_amd64'
      },
      signals: { metrics: 'supported', logs: 'unsupported', traces: 'supported' },
      component,
      secretPlaceholders: {
        authorizationToken: {
          marker: '${HERTZBEAT_TOKEN}',
          valueFormat: 'url_unreserved',
          replacement: 'raw'
        }
      },
      steps: [{
        id: 'configure',
        type: 'configure',
        titleKey: 'instrumentation.step.configure',
        executionLocationKey: 'instrumentation.location.application_environment',
        snippets: [{
          id: 'otel-environment',
          language: 'bash',
          content: "export OTEL_EXPORTER_OTLP_HEADERS='Authorization=Bearer%20${HERTZBEAT_TOKEN}'",
          secretPlaceholders: ['authorizationToken']
        }]
      }]
    });
    const snippet = guide.steps[0]!.snippets[0]!;

    expect(materializeSnippetForCopy(snippet, guide.secretPlaceholders, {
      authorizationToken: 'hb.token-1_~'
    })).toContain('Bearer%20hb.token-1_~');
    expect(snippet.content).toContain('${HERTZBEAT_TOKEN}');
    expect(() => materializeSnippetForCopy(snippet, guide.secretPlaceholders, {
      authorizationToken: 'token with spaces'
    })).toThrow(InstrumentationContractError);
  });

  it('rejects secret markers that are undeclared, unused, or duplicated', () => {
    const guide = guideFixture();
    const undeclared = structuredClone(guide);
    undeclared.steps[0]!.snippets[0]!.secretPlaceholders = [];
    expect(() => parseGuideRenderResponse(undeclared)).toThrow(InstrumentationContractError);

    const unused = structuredClone(guide);
    unused.steps[0]!.snippets[0]!.content = 'start application';
    expect(() => parseGuideRenderResponse(unused)).toThrow(InstrumentationContractError);

    const duplicate = structuredClone(guide);
    const duplicatePlaceholders = duplicate.secretPlaceholders as Record<
      string,
      (typeof duplicate.secretPlaceholders)['authorizationToken']
    >;
    duplicatePlaceholders.secondaryToken = duplicate.secretPlaceholders.authorizationToken!;
    duplicate.steps[0]!.snippets[0]!.secretPlaceholders.push('secondaryToken');
    expect(() => parseGuideRenderResponse(duplicate)).toThrow(InstrumentationContractError);
  });

  it('parses five-state detection, polling decisions, invariants, and typed jumps', () => {
    const response = parseDetectionResponse(detectionFixture());

    expect(response.signals.metrics).toEqual({
      status: 'received',
      lastReceivedAt: 1_710_000_004_200,
      errorCode: null
    });
    expect(response.signals.logs.status).toBe('waiting');
    expect(response.signals.traces.status).toBe('unsupported');
    expect(response.polling).toEqual({
      decision: 'continue_polling',
      pollAfterMs: 3_000,
      deadlineAt: 1_710_000_120_000
    });
    expect(response.queryJumps[0]).toMatchObject({ signal: 'metrics', enabled: true });
    expect(response.queryJumps[1]).toMatchObject({ signal: 'logs', enabled: false });

    const unavailable = detectionFixture();
    unavailable.signals.logs = { status: 'unavailable', lastReceivedAt: null, errorCode: 'storage_unavailable' };
    unavailable.polling = { decision: 'manual_retry', pollAfterMs: null, deadlineAt: 1_710_000_120_000 };
    expect(parseDetectionResponse(unavailable).signals.logs.status).toBe('unavailable');

    const errored = detectionFixture();
    errored.signals.logs = { status: 'error', lastReceivedAt: null, errorCode: 'storage_query_failed' };
    errored.polling = { decision: 'manual_retry', pollAfterMs: null, deadlineAt: 1_710_000_120_000 };
    expect(parseDetectionResponse(errored).signals.logs.status).toBe('error');

    const inconsistent = detectionFixture();
    inconsistent.signals.logs = {
      status: 'waiting',
      lastReceivedAt: 1_710_000_001_000,
      errorCode: 'signal_not_received'
    };
    expect(() => parseDetectionResponse(inconsistent)).toThrow(InstrumentationContractError);
  });

  it('rejects query handoffs that point outside the detected service context', () => {
    const mismatchedRoot = detectionFixture();
    mismatchedRoot.queryJumpContext.serviceName = 'another-service';
    expect(() => parseDetectionResponse(mismatchedRoot)).toThrow(InstrumentationContractError);

    const mismatchedSignal = detectionFixture();
    mismatchedSignal.queryJumps[0]!.context.environment = 'staging';
    expect(() => parseDetectionResponse(mismatchedSignal)).toThrow(InstrumentationContractError);
  });

  it('normalizes omitted nullable detection fields from the Spring response', () => {
    const response = detectionFixture();
    response.signals.logs = { status: 'unsupported', lastReceivedAt: null, errorCode: 'signal_not_supported' };
    response.signals.metrics = { status: 'received', lastReceivedAt: 1_710_000_004_200, errorCode: null };
    response.signals.traces = { status: 'received', lastReceivedAt: 1_710_000_004_500, errorCode: null };
    response.polling = { decision: 'complete', pollAfterMs: null, deadlineAt: 1_710_000_120_000 };
    delete (response.signals.logs as Partial<typeof response.signals.logs>).lastReceivedAt;
    delete (response.signals.metrics as Partial<typeof response.signals.metrics>).errorCode;
    delete (response.signals.traces as Partial<typeof response.signals.traces>).errorCode;
    delete (response.polling as Partial<typeof response.polling>).pollAfterMs;
    response.queryJumps[1]!.enabled = false;
    response.queryJumps[2]!.enabled = true;

    expect(parseDetectionResponse(response)).toMatchObject({
      signals: {
        metrics: { errorCode: null },
        logs: { lastReceivedAt: null },
        traces: { errorCode: null }
      },
      polling: { decision: 'complete', pollAfterMs: null }
    });
  });

  it('serializes only v1 allowlisted request fields and drops injected secrets', () => {
    expect(buildGuideRenderPayload({ ...renderRequest, token: 'must-not-leave-memory' } as GuideRenderRequest & {
      token: string;
    })).toEqual(renderRequest);
    expect(buildDetectionPayload({ ...detectionRequest, token: 'must-not-leave-memory' } as DetectionRequest & {
      token: string;
    })).toEqual(detectionRequest);
  });
});

function detectionFixture() {
  const signal = (status: string, lastReceivedAt: number | null, errorCode: string | null) => ({
    status,
    lastReceivedAt,
    errorCode
  });
  const context = {
    serviceName: 'checkout-api',
    serviceNamespace: 'commerce',
    environment: 'prod',
    collectorId: 'collector-east',
    startedAt: 1_710_000_000_000,
    detectedAt: 1_710_000_005_000
  };
  const polling: { decision: string; pollAfterMs: number | null; deadlineAt: number } = {
    decision: 'continue_polling',
    pollAfterMs: 3_000,
    deadlineAt: 1_710_000_120_000
  };
  return {
    schemaVersion: 1,
    detectedAt: context.detectedAt,
    context: { ...detectionRequest },
    signals: {
      metrics: signal('received', 1_710_000_004_200, null),
      logs: signal('waiting', null, 'signal_not_received'),
      traces: signal('unsupported', null, 'signal_not_supported')
    },
    polling,
    queryJumpContext: context,
    queryJumps: [
      { signal: 'metrics', enabled: true, context },
      { signal: 'logs', enabled: false, context },
      { signal: 'traces', enabled: false, context }
    ]
  };
}

function guideFixture() {
  return {
    schemaVersion: 1,
    selection: {
      language: 'nodejs', framework: 'express', method: 'zero_code', environment: 'docker', platform: 'linux_amd64'
    },
    signals: { metrics: 'supported', logs: 'unsupported', traces: 'supported' },
    component: structuredClone(component),
    secretPlaceholders: {
      authorizationToken: { marker: '${HERTZBEAT_TOKEN}', valueFormat: 'url_unreserved', replacement: 'raw' }
    },
    steps: [{
      id: 'configure', type: 'configure', titleKey: 'instrumentation.step.configure',
      executionLocationKey: 'instrumentation.location.application_environment',
      snippets: [{
        id: 'otel-environment', language: 'bash', content: 'Authorization=Bearer%20${HERTZBEAT_TOKEN}',
        secretPlaceholders: ['authorizationToken']
      }]
    }]
  };
}
