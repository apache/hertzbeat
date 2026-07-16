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

import { afterEach, describe, expect, it, vi } from 'vitest';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet }));

import { loadInstrumentationCollectors } from './collector-api';

afterEach(() => vi.restoreAllMocks());

describe('instrumentation Collector API', () => {
  it('accepts the exact available v1 advertisement without changing its public source shape', async () => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east', availableIntake())));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({
      status: 'available',
      schemaVersion: 1,
      collectorId: 'collector-east',
      gateway: 'collector',
      capabilities: ['otlp_http_protobuf', 'otlp_grpc'],
      otlpHttpEndpoint: 'https://otel.example.com:4318/otel',
      otlpGrpcEndpoint: 'https://otel.example.com:4317',
      authorizationHeader: 'Authorization'
    });
  });

  it.each([
    ['server gateway', { gateway: 'server' }],
    ['reversed capability order', { capabilities: ['otlp_grpc', 'otlp_http_protobuf'] }]
  ])('accepts frozen available variant: %s', async (_label, override) => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east', { ...availableIntake(), ...override })));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake.status).toBe('available');
  });

  it('treats an absent advertisement as an old server without deriving endpoints', async () => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east')));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({ status: 'unavailable', errorCode: 'old_server' });
    expect(JSON.stringify(collector?.intake)).not.toMatch(/10\.0\.0\.8|431[78]|location|host/i);
    expect(apiMessageGet).toHaveBeenCalledWith('/api/collector?pageIndex=0&pageSize=200', undefined);
  });

  it.each([
    'intake_not_advertised',
    'intake_advertisement_invalid',
    'intake_advertisement_unavailable'
  ] as const)('accepts canonical unavailable state %s', async errorCode => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east', unavailableIntake(errorCode))));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({ status: 'unavailable', errorCode });
  });

  it.each([
    ['schema mismatch', { schemaVersion: 2 }],
    ['Collector identity mismatch', { collectorId: '10.0.0.8' }],
    ['empty Collector identity', { collectorId: '' }],
    ['unknown state', { state: 'healthy' }],
    ['unknown gateway', { gateway: 'browser' }],
    ['missing gateway', { gateway: null }],
    ['missing HTTP capability', { capabilities: ['otlp_grpc'] }],
    ['duplicate capability', { capabilities: ['otlp_http_protobuf', 'otlp_grpc', 'otlp_grpc'] }],
    ['unknown capability', { capabilities: ['otlp_http_protobuf', 'otlp_grpc', 'zipkin'] }],
    ['null endpoint', { otlpHttpEndpoint: null }],
    ['missing endpoint', { otlpGrpcEndpoint: undefined }],
    ['missing header', { authorizationHeader: undefined }],
    ['wrong header', { authorizationHeader: 'X-HertzBeat-Token' }],
    ['non-null available error', { errorCode: 'intake_advertisement_invalid' }],
    ['HTTP endpoint', { otlpHttpEndpoint: 'http://otel.example.com:4318' }],
    ['non-HTTPS endpoint', { otlpGrpcEndpoint: 'grpc://otel.example.com:4317' }],
    ['malformed endpoint', { otlpHttpEndpoint: 'not a URL' }],
    ['endpoint userinfo', { otlpHttpEndpoint: 'https://user:secret@otel.example.com:4318' }],
    ['endpoint query', { otlpHttpEndpoint: 'https://otel.example.com:4318?token=secret' }],
    ['endpoint fragment', { otlpGrpcEndpoint: 'https://otel.example.com:4317#secret' }]
  ])('degrades an invalid available advertisement: %s', async (_label, override) => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east', { ...availableIntake(), ...override })));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({ status: 'unavailable', errorCode: 'intake_advertisement_invalid' });
  });

  it.each([null, 'https://otel.example.com:4318', 1, []])(
    'degrades a present non-object advertisement: %j',
    async instrumentationIntake => {
      apiMessageGet.mockResolvedValue(page(summary('collector-east', instrumentationIntake)));

      const [collector] = await loadInstrumentationCollectors();

      expect(collector?.intake).toEqual({ status: 'unavailable', errorCode: 'intake_advertisement_invalid' });
    }
  );

  it('rejects Collector identity mismatch in canonical unavailable state', async () => {
    apiMessageGet.mockResolvedValue(page(summary(
      'collector-east',
      { ...unavailableIntake('intake_not_advertised'), collectorId: 'collector-west' }
    )));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({ status: 'unavailable', errorCode: 'intake_advertisement_invalid' });
  });

  it.each([
    ['missing schema', { schemaVersion: undefined }],
    ['missing Collector identity', { collectorId: undefined }],
    ['missing state', { state: undefined }],
    ['missing capabilities', { capabilities: undefined }],
    ['missing unavailable gateway', { gateway: undefined }],
    ['missing unavailable endpoint', { otlpHttpEndpoint: undefined }],
    ['missing unavailable header', { authorizationHeader: undefined }],
    ['missing unavailable error', { errorCode: undefined }],
    ['non-empty unavailable capability', { capabilities: ['otlp_grpc'] }],
    ['non-null unavailable endpoint', { otlpGrpcEndpoint: 'https://otel.example.com:4317' }]
  ])('degrades null/missing canonical fields: %s', async (_label, override) => {
    const base = _label.includes('unavailable')
      ? unavailableIntake('intake_not_advertised')
      : availableIntake();
    apiMessageGet.mockResolvedValue(page(summary('collector-east', { ...base, ...override })));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({ status: 'unavailable', errorCode: 'intake_advertisement_invalid' });
  });

  it('degrades only the malformed advertisement and never reflects rejected secret material', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const rejected = 'https://operator:plain_secret@rejected.example.com:4318?token=plain_secret';
    apiMessageGet.mockResolvedValue(page(
      summary('collector-bad', { ...availableIntake('collector-bad'), otlpHttpEndpoint: rejected }),
      summary('collector-good', availableIntake('collector-good'))
    ));

    const collectors = await loadInstrumentationCollectors();

    expect(collectors.map(item => item.intake.status)).toEqual(['unavailable', 'available']);
    expect(JSON.stringify(collectors[0]?.intake)).not.toContain('plain_secret');
    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('plain_secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('plain_secret');
  });
});

function page(...content: unknown[]) {
  return { content };
}

function summary(name: string, instrumentationIntake?: unknown) {
  return {
    collector: { name, ip: name === 'collector-east' ? '10.0.0.8' : '10.0.0.9', status: 0 },
    ...(instrumentationIntake !== undefined ? { instrumentationIntake } : {})
  };
}

function availableIntake(collectorId = 'collector-east'): Record<string, unknown> {
  return {
    schemaVersion: 1,
    collectorId,
    state: 'available',
    gateway: 'collector',
    capabilities: ['otlp_http_protobuf', 'otlp_grpc'],
    otlpHttpEndpoint: 'https://otel.example.com:4318/otel',
    otlpGrpcEndpoint: 'https://otel.example.com:4317',
    authorizationHeader: 'Authorization',
    errorCode: null
  };
}

function unavailableIntake(errorCode: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    collectorId: 'collector-east',
    state: 'unavailable',
    gateway: null,
    capabilities: [],
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: null,
    authorizationHeader: null,
    errorCode
  };
}
