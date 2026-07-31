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
  it('parses the backend-owned source directory without accepting legacy source shapes', () => {
    const value = parseCatalogResponse({
      schemaVersion: 2,
      groups: [
        { id: 'quick_start', labelKey: 'instrumentation.v2.directory.group.quick_start' },
        { id: 'applications', labelKey: 'instrumentation.v2.directory.group.applications' }
      ],
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
          signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
          documentationUrl: 'https://opentelemetry.io/docs/'
        },
        {
          id: 'java',
          labelKey: 'instrumentation.v2.directory.source.java',
          descriptionKey: 'instrumentation.v2.directory.source.java_description',
          iconKey: 'java',
          groupIds: ['applications'],
          support: 'supported',
          sourceKind: 'application',
          recipeIds: ['java_spring'],
          signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
          documentationUrl: 'https://opentelemetry.io/docs/languages/java/'
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
        },
        {
          id: 'java_spring',
          kind: 'application',
          labelKey: 'instrumentation.recipe.java_spring',
          preview: false,
          language: 'java',
          framework: 'spring_boot',
          method: 'zero_code',
          environments: ['docker'],
          platforms: ['linux_amd64'],
          signals: { metrics: 'supported', logs: 'preview', traces: 'supported' },
          components: [component],
          blocksPreview: ['environment']
        }
      ]
    });
    expect(Object.keys(value)).toEqual(['schemaVersion', 'groups', 'sources', 'recipes']);
    expect(value.sources[1]?.recipeIds).toEqual(['java_spring']);
    expect(value.recipes[0]?.id).toBe('opentelemetry_telemetrygen');
  });

  it('keeps unsupported catalog entries discoverable but non-selectable', () => {
    const source = parseCatalogResponse({
      schemaVersion: 2,
      groups: [{ id: 'logs', labelKey: 'instrumentation.v2.directory.group.logs' }],
      sources: [
        {
          id: 'fluent_bit',
          labelKey: 'instrumentation.v2.directory.source.fluent_bit',
          descriptionKey: 'instrumentation.v2.directory.source.fluent_bit_description',
          iconKey: 'fluent-bit',
          groupIds: ['logs'],
          support: 'unsupported',
          recipeIds: [],
          signals: { metrics: 'unsupported', logs: 'unsupported', traces: 'unsupported' }
        }
      ],
      recipes: []
    }).sources[0];
    expect(source).toMatchObject({ id: 'fluent_bit', support: 'unsupported' });
    expect(source).not.toHaveProperty('sourceKind');
  });

  it('rejects unknown source groups and inconsistent unsupported entries', () => {
    const base = {
      schemaVersion: 2,
      groups: [{ id: 'logs', labelKey: 'instrumentation.v2.directory.group.logs' }],
      recipes: []
    };
    const source = {
      id: 'fluent_bit',
      labelKey: 'instrumentation.v2.directory.source.fluent_bit',
      descriptionKey: 'instrumentation.v2.directory.source.fluent_bit_description',
      iconKey: 'fluent-bit',
      groupIds: ['missing'],
      support: 'unsupported',
      recipeIds: [],
      signals: { metrics: 'unsupported', logs: 'unsupported', traces: 'unsupported' }
    };
    expect(() => parseCatalogResponse({ ...base, sources: [source] })).toThrow();
    expect(() =>
      parseCatalogResponse({
        ...base,
        sources: [{ ...source, groupIds: ['logs'], sourceKind: 'application', recipeIds: ['java_spring'] }]
      })
    ).toThrow();
    expect(() =>
      parseCatalogResponse({
        ...base,
        sources: [
          {
            ...source,
            groupIds: ['logs'],
            support: 'preview',
            sourceKind: 'existing_opentelemetry',
            recipeIds: ['missing']
          }
        ]
      })
    ).toThrow();
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
    ['https://example.test/otlp', 'plaintext'],
    ['http://example.test/otlp', 'tls'],
    ['ftp://example.test/otlp', 'plaintext'],
    ['http://', 'plaintext'],
    ['http:example.test/otlp', 'plaintext'],
    ['http:/example.test/otlp', 'plaintext'],
    ['http:///example.test/otlp', 'plaintext'],
    [' http://example.test/otlp', 'plaintext'],
    ['https://user@example.test/otlp', 'tls'],
    ['https://example.test/otlp?token=secret', 'tls'],
    ['https://example.test/otlp#fragment', 'tls']
  ])('rejects endpoint/security mismatch or unsafe URL %s', (url, security) => {
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
            endpoints: { http_protobuf: { url, security } },
            authentication: 'bearer_token',
            authorizationHeader: 'Authorization'
          }
        ]
      })
    ).toThrow();
  });

  it.each([
    ['https://example.test/otlp', 'tls'],
    ['http://example.test/otlp', 'plaintext']
  ])('preserves backend endpoint security evidence for %s', (url, security) => {
    expect(
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
            endpoints: { http_protobuf: { url, security } },
            authentication: 'bearer_token',
            authorizationHeader: 'Authorization'
          }
        ]
      }).profiles[0]?.endpoints.http_protobuf
    ).toEqual({ url, security });
  });

  it('rejects the removed httpsEndpoints field and unavailable advertised endpoints', () => {
    expect(() =>
      parseIntakeProfilesResponse({
        schemaVersion: 2,
        status: 'available',
        profiles: [
          {
            id: 'server-default',
            kind: 'server',
            availability: 'available',
            gateway: 'server',
            supportedTransports: ['http_protobuf'],
            httpsEndpoints: { http_protobuf: 'https://example.test/otlp' },
            authentication: 'bearer_token',
            authorizationHeader: 'Authorization'
          }
        ]
      })
    ).toThrow();
    expect(() =>
      parseIntakeProfilesResponse({
        schemaVersion: 2,
        status: 'available',
        profiles: [
          {
            id: 'collector-edge',
            kind: 'hertzbeat_collector',
            availability: 'unavailable',
            supportedTransports: [],
            endpoints: {
              http_protobuf: { url: 'http://collector.test:4318', security: 'plaintext' }
            },
            collectorId: 'edge',
            errorCode: 'intake_profile_unavailable'
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
            endpoints: { grpc: { url: 'https://example.test:4317', security: 'tls' } },
            authentication: 'bearer_token',
            authorizationHeader: 'Authorization'
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
            endpoints: {},
            collectorId: 'edge',
            errorCode: 'intake_profile_unavailable'
          }
        ]
      }).profiles[0]?.collectorId
    ).toBe('edge');
  });

  it('parses an explicitly unauthenticated external destination without legacy authorization metadata', () => {
    const response = parseIntakeProfilesResponse({
      schemaVersion: 2,
      status: 'available',
      defaultProfileId: 'external-local',
      profiles: [
        {
          id: 'external-local',
          kind: 'external_otel_collector',
          availability: 'available',
          gateway: 'external',
          supportedTransports: ['http_protobuf'],
          endpoints: { http_protobuf: { url: 'http://otel.example.test:4318', security: 'plaintext' } },
          authentication: 'none'
        }
      ]
    });

    expect(response.profiles[0]).toMatchObject({
      authentication: 'none',
      authorizationHeader: null
    });
    expect(JSON.stringify(response)).not.toContain('authHeaderName');
  });

  it.each([
    { authentication: 'none', authorizationHeader: 'Authorization' },
    { authentication: 'bearer_token', authorizationHeader: null },
    { authentication: 'bearer_token', authorizationHeader: 'X-Authorization' },
    { authentication: 'none', authHeaderName: 'Authorization' }
  ])('rejects inconsistent or legacy authentication metadata %#', authentication => {
    expect(() =>
      parseIntakeProfilesResponse({
        schemaVersion: 2,
        status: 'available',
        defaultProfileId: 'external-local',
        profiles: [
          {
            id: 'external-local',
            kind: 'external_otel_collector',
            availability: 'available',
            gateway: 'external',
            supportedTransports: ['http_protobuf'],
            endpoints: { http_protobuf: { url: 'http://otel.example.test:4318', security: 'plaintext' } },
            ...authentication
          }
        ]
      })
    ).toThrow();
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
          endpoints: { http_protobuf: { url: 'https://example.test/otlp', security: 'tls' } },
          authentication: 'bearer_token',
          authorizationHeader: 'Authorization'
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
        endpoints: { http_protobuf: { url: 'https://example.test/v1/otlp', security: 'tls' } },
        authentication: 'bearer_token',
        authorizationHeader: 'Authorization'
      },
      service,
      signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
      components: [component],
      secretPlaceholders: {
        authorizationToken: { marker: '${HERTZBEAT_TOKEN}', kind: 'authorization_token' }
      },
      blocks: [
        {
          id: 'plaintext_transport_warning',
          type: 'warning',
          titleKey: 'instrumentation.v2.block.plaintext_transport_warning',
          bodyKey: 'instrumentation.v2.warning.plaintext_authorization',
          executionLocationKey: 'instrumentation.location.hertzbeat',
          placeholders: []
        },
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
    expect(value.blocks[0]).toMatchObject({ id: 'plaintext_transport_warning', type: 'warning' });
    expect(value.blocks[1]?.content).toContain('${HERTZBEAT_TOKEN}');
    expect(JSON.stringify(value)).not.toContain('secret-value');
  });

  it('accepts a no-auth guide only when token declarations, markers, and Authorization content are absent', () => {
    const value = parseRenderResponse({
      schemaVersion: 2,
      sourceKind: 'existing_opentelemetry',
      recipeId: 'existing_otlp',
      intakeProfile: {
        id: 'external-local',
        kind: 'external_otel_collector',
        availability: 'available',
        gateway: 'external',
        supportedTransports: ['http_protobuf'],
        endpoints: { http_protobuf: { url: 'http://otel.example.test:4318', security: 'plaintext' } },
        authentication: 'none'
      },
      service,
      signals: { metrics: 'supported', logs: 'supported', traces: 'supported' },
      components: [],
      secretPlaceholders: {},
      blocks: [
        {
          id: 'configure_exporter',
          type: 'code',
          titleKey: 'instrumentation.v2.block.configure_exporter',
          executionLocationKey: 'instrumentation.location.otel_collector',
          language: 'yaml',
          content: 'endpoint: http://otel.example.test:4318',
          placeholders: []
        }
      ]
    });

    expect(value.intakeProfile).toMatchObject({ authentication: 'none', authorizationHeader: null });
    expect(value.secretPlaceholders).toEqual({});
    expect(value.blocks[0]?.placeholders).toEqual([]);

    expect(() =>
      parseRenderResponse({
        ...value,
        blocks: [{ ...value.blocks[0]!, content: 'Authorization: Bearer ${HERTZBEAT_TOKEN}' }]
      })
    ).toThrow();
    expect(() =>
      parseRenderResponse({
        ...value,
        intakeProfile: {
          ...value.intakeProfile,
          availability: 'unavailable',
          gateway: undefined,
          supportedTransports: [],
          endpoints: {},
          authentication: undefined,
          errorCode: 'intake_profile_unavailable'
        },
        blocks: []
      })
    ).toThrow();
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
        windowEndAt: 121000
      },
      signals: {
        metrics: { status: 'received', lastReceivedAt: 1900 },
        logs: { status: 'waiting', errorCode: 'signal_not_received' },
        traces: { status: 'unsupported', errorCode: 'signal_not_supported' }
      },
      polling: { decision: 'continue_polling', pollAfterMs: 3000, deadlineAt: 121000 },
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

  it('rejects detection evidence that escapes the safe scoped status contract', () => {
    const response = detectionResponse();
    expect(() =>
      parseDetectionResponse({
        ...response,
        signals: {
          ...response.signals,
          metrics: { status: 'received', lastReceivedAt: response.detectedAt + 1 }
        }
      })
    ).toThrow();
    expect(() =>
      parseDetectionResponse({
        ...response,
        signals: {
          ...response.signals,
          logs: { status: 'unavailable', errorCode: 'database_password_leaked' }
        }
      })
    ).toThrow();
    expect(() =>
      parseDetectionResponse({
        ...response,
        polling: { decision: 'complete', deadlineAt: response.context.windowEndAt }
      })
    ).toThrow();
  });

  it('binds query jumps to the complete echoed detection context', () => {
    const response = detectionResponse();
    const mismatchedJumpContext = {
      ...response.queryJumpContext,
      collectorId: 'other-collector',
      serviceInstanceId: 'other-instance',
      endpoint: '/other'
    };
    expect(() =>
      parseDetectionResponse({
        ...response,
        queryJumpContext: mismatchedJumpContext,
        queryJumps: response.queryJumps.map(jump => ({ ...jump, context: mismatchedJumpContext }))
      })
    ).toThrow();
  });
});

function detectionResponse() {
  const scopedService = {
    ...service,
    serviceInstanceId: 'checkout-1',
    endpoint: '/checkout/{id}'
  };
  const scopedJump = {
    serviceName: scopedService.name,
    serviceNamespace: scopedService.namespace,
    environment: scopedService.environment,
    intakeProfileId: 'collector-edge',
    collectorId: 'edge',
    serviceInstanceId: scopedService.serviceInstanceId,
    endpoint: scopedService.endpoint,
    startedAt: 1000,
    detectedAt: 2000
  };
  return {
    schemaVersion: 2 as const,
    detectedAt: 2000,
    context: {
      sourceKind: 'quick_start' as const,
      recipeId: 'opentelemetry_telemetrygen',
      service: scopedService,
      intakeProfileId: 'collector-edge',
      collectorId: 'edge',
      startedAt: 1000,
      windowEndAt: 121000
    },
    signals: {
      metrics: { status: 'received' as const, lastReceivedAt: 1900 },
      logs: { status: 'waiting' as const, errorCode: 'signal_not_received' },
      traces: { status: 'unsupported' as const, errorCode: 'signal_not_supported' }
    },
    polling: { decision: 'continue_polling' as const, pollAfterMs: 3000, deadlineAt: 121000 },
    queryJumpContext: scopedJump,
    queryJumps: [
      { signal: 'metrics' as const, enabled: true, context: scopedJump },
      { signal: 'logs' as const, enabled: false, context: scopedJump },
      { signal: 'traces' as const, enabled: false, context: scopedJump }
    ]
  };
}
