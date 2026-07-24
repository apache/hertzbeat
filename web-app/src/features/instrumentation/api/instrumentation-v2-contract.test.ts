/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  parseCatalogResponse,
  parseDetectionResponse,
  parseIntakeProfilesResponse,
  parseRenderResponse
} from './instrumentation-v2-wire';

const component = {
  name: 'OpenTelemetry',
  sourceUrl: 'https://github.com/open-telemetry/opentelemetry-collector-contrib',
  version: '0.130.0',
  versionPolicy: 'pinned',
  license: 'Apache-2.0',
  installationLocationKey: 'instrumentation.location.application',
  official: true,
  bundledWithHertzBeat: false,
  dependencies: [],
  artifacts: []
};

const service = { name: 'checkout', namespace: 'shop', environment: 'production' };
const jumpContext = {
  serviceName: 'checkout',
  serviceNamespace: 'shop',
  environment: 'production',
  intakeProfileId: 'server-default',
  startedAt: 1000,
  detectedAt: 2000
};

describe('instrumentation v2 wire contracts', () => {
  it('parses backend-owned catalog order and option values', () => {
    const value = parseCatalogResponse({
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
      recipes: [
        {
          id: 'opentelemetry_telemetrygen',
          kind: 'quick_start',
          labelKey: 'instrumentation.recipe.telemetrygen',
          preview: false,
          environments: ['docker'],
          platforms: ['linux_amd64'],
          signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
          components: [component],
          blocksPreview: ['command', 'environment', 'check']
        }
      ]
    });
    expect(value.recipes[0]?.id).toBe('opentelemetry_telemetrygen');
  });

  it.each([
    { schemaVersion: 2, status: 'unconfigured', profiles: [] },
    {
      schemaVersion: 2,
      status: 'unavailable',
      errorCode: 'intake_profile_discovery_unavailable',
      profiles: []
    }
  ])('preserves the frozen profile discovery state %#', value => {
    expect(parseIntakeProfilesResponse(value)).toEqual(value);
  });

  it('rejects unavailable discovery disguised as an empty available result', () => {
    expect(() => parseIntakeProfilesResponse({ schemaVersion: 2, status: 'available', profiles: [] })).toThrow();
  });

  it.each([
    'http://example.test/otlp',
    'https://user@example.test/otlp',
    'https://example.test/otlp?token=secret',
    'https://example.test/otlp#fragment'
  ])('rejects unsafe intake endpoint %s', endpoint => {
    expect(() =>
      parseIntakeProfilesResponse({
        schemaVersion: 2,
        status: 'available',
        defaultProfileId: 'server-default',
        profiles: [
          {
            id: 'server-default',
            kind: 'server',
            availability: 'available',
            gateway: 'server',
            supportedTransports: ['http_protobuf'],
            httpsEndpoints: { http_protobuf: endpoint },
            authHeaderName: 'Authorization'
          }
        ]
      })
    ).toThrow();
  });

  it('rejects profile kind/gateway and Collector identity mismatches', () => {
    expect(() =>
      parseIntakeProfilesResponse({
        schemaVersion: 2,
        status: 'available',
        profiles: [
          {
            id: 'collector-edge',
            kind: 'hertzbeat_collector',
            availability: 'available',
            gateway: 'server',
            supportedTransports: ['grpc'],
            httpsEndpoints: { grpc: 'https://example.test:4317' },
            authHeaderName: 'Authorization'
          }
        ]
      })
    ).toThrow();
  });

  it('allows an unavailable Collector identity without advertised connectivity', () => {
    expect(
      parseIntakeProfilesResponse({
        schemaVersion: 2,
        status: 'available',
        profiles: [
          {
            id: 'collector-edge',
            kind: 'hertzbeat_collector',
            availability: 'unavailable',
            supportedTransports: [],
            httpsEndpoints: {},
            collectorId: 'edge',
            errorCode: 'intake_profile_unavailable'
          }
        ]
      }).profiles[0]?.collectorId
    ).toBe('edge');
  });

  it.each([
    'http://example.test/docs',
    'https://user@example.test/docs',
    'https://example.test/docs?token=secret',
    'https://example.test/docs#fragment'
  ])('rejects unsafe guide link %s', href => {
    expect(() =>
      parseRenderResponse({
        schemaVersion: 2,
        sourceKind: 'existing_opentelemetry',
        recipeId: 'existing_otlp',
        intakeProfile: {
          id: 'server-default',
          kind: 'server',
          availability: 'available',
          gateway: 'server',
          supportedTransports: ['http_protobuf'],
          httpsEndpoints: { http_protobuf: 'https://example.test/otlp' },
          authHeaderName: 'Authorization'
        },
        service,
        signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
        components: [],
        secretPlaceholders: {
          authorizationToken: { marker: '${HERTZBEAT_TOKEN}', kind: 'authorization_token' }
        },
        blocks: [
          {
            id: 'docs',
            type: 'link',
            titleKey: 'instrumentation.v2.block.docs',
            executionLocationKey: 'instrumentation.location.hertzbeat_ui',
            href,
            placeholders: []
          }
        ]
      })
    ).toThrow();
  });

  it('parses generic guide blocks without materializing the token', () => {
    const value = parseRenderResponse({
      schemaVersion: 2,
      sourceKind: 'quick_start',
      recipeId: 'opentelemetry_telemetrygen',
      intakeProfile: {
        id: 'server-default',
        kind: 'server',
        availability: 'available',
        gateway: 'server',
        supportedTransports: ['http_protobuf'],
        httpsEndpoints: { http_protobuf: 'https://example.test/v1/otlp' },
        authHeaderName: 'Authorization'
      },
      service,
      signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
      components: [component],
      secretPlaceholders: {
        authorizationToken: { marker: '${HERTZBEAT_TOKEN}', kind: 'authorization_token' }
      },
      blocks: [
        {
          id: 'send',
          type: 'command',
          titleKey: 'instrumentation.block.send',
          executionLocationKey: 'instrumentation.location.terminal',
          language: 'shell',
          content: 'Authorization=${HERTZBEAT_TOKEN}',
          placeholders: ['authorizationToken']
        },
        {
          id: 'verify',
          type: 'check',
          titleKey: 'instrumentation.block.verify',
          bodyKey: 'instrumentation.v2.block.verify_body',
          executionLocationKey: 'instrumentation.location.hertzbeat',
          placeholders: []
        }
      ]
    });
    expect(value.blocks[0]?.content).toContain('${HERTZBEAT_TOKEN}');
    expect(JSON.stringify(value)).not.toContain('secret-value');
  });

  it('requires exactly three backend query jumps and preserves their contexts', () => {
    const response = parseDetectionResponse({
      schemaVersion: 2,
      detectedAt: 2000,
      context: {
        sourceKind: 'quick_start',
        recipeId: 'opentelemetry_telemetrygen',
        service,
        intakeProfileId: 'server-default',
        startedAt: 1000,
        windowEndAt: 2000
      },
      signals: {
        metrics: { status: 'received', lastReceivedAt: 1900 },
        logs: { status: 'waiting', errorCode: 'signal_not_received' },
        traces: { status: 'unsupported', errorCode: 'signal_not_supported' }
      },
      polling: { decision: 'complete', deadlineAt: 3000 },
      queryJumpContext: jumpContext,
      queryJumps: [
        { signal: 'metrics', enabled: true, context: jumpContext },
        { signal: 'logs', enabled: false, context: jumpContext },
        { signal: 'traces', enabled: false, context: jumpContext }
      ]
    });
    expect(response.queryJumps.map(jump => jump.signal)).toEqual(['metrics', 'logs', 'traces']);
    expect(() => parseDetectionResponse({ ...response, queryJumps: response.queryJumps.slice(0, 2) })).toThrow();
    expect(() =>
      parseDetectionResponse({
        ...response,
        queryJumps: response.queryJumps.map((jump, index) => (index === 0 ? { ...jump, enabled: false } : jump))
      })
    ).toThrow();
    expect(() =>
      parseDetectionResponse({
        ...response,
        queryJumps: response.queryJumps.map((jump, index) =>
          index === 0 ? { ...jump, context: { ...jump.context, serviceName: 'other' } } : jump
        )
      })
    ).toThrow();
  });
});
