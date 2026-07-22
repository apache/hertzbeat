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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';

import { CollectorContractError, collectorReadFailureKind, loadInstrumentationCollectors } from './collector-api';
import type { InstrumentationFlowDraft } from '../model/instrumentation-flow';
import { buildDetectionRequest, buildGuideRequest } from '../model/instrumentation-requests';

afterEach(() => vi.restoreAllMocks());
beforeEach(() => apiMessageGet.mockReset());

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

  it.each([
    [
      'HTTP only',
      {
        capabilities: ['otlp_http_protobuf'],
        otlpGrpcEndpoint: null
      }
    ],
    [
      'gRPC only',
      {
        capabilities: ['otlp_grpc'],
        otlpHttpEndpoint: null
      }
    ]
  ])('accepts an available %s capability subset with only its matching endpoint', async (_label, override) => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east', { ...availableIntake(), ...override })));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toMatchObject({ status: 'available', ...override });
  });

  it('rejects an absent mandatory advertisement instead of inventing old-server compatibility', async () => {
    apiMessageGet.mockResolvedValue(page(summaryWithoutIntake('collector-east')));

    await expect(loadInstrumentationCollectors()).rejects.toBeInstanceOf(CollectorContractError);
    expect(apiMessageGet).toHaveBeenCalledWith('/api/collector?pageIndex=0&pageSize=200', undefined);
  });

  it.each(['intake_not_advertised', 'intake_advertisement_invalid', 'intake_advertisement_unavailable'] as const)(
    'accepts canonical unavailable state %s',
    async errorCode => {
      apiMessageGet.mockResolvedValue(page(summary('collector-east', unavailableIntake(errorCode))));

      const [collector] = await loadInstrumentationCollectors();

      expect(collector?.intake).toEqual({ status: 'unavailable', errorCode });
    }
  );

  it.each([
    ['schema mismatch', { schemaVersion: 2 }],
    ['Collector identity mismatch', { collectorId: '10.0.0.8' }],
    ['empty Collector identity', { collectorId: '' }],
    ['unknown state', { state: 'healthy' }],
    ['unknown gateway', { gateway: 'browser' }],
    ['missing gateway', { gateway: null }],
    ['HTTP endpoint without capability', { capabilities: ['otlp_grpc'] }],
    ['gRPC endpoint without capability', { capabilities: ['otlp_http_protobuf'] }],
    ['HTTP capability without endpoint', { capabilities: ['otlp_http_protobuf'], otlpHttpEndpoint: null }],
    ['gRPC capability without endpoint', { capabilities: ['otlp_grpc'], otlpGrpcEndpoint: null }],
    ['empty capability set', { capabilities: [], otlpHttpEndpoint: null, otlpGrpcEndpoint: null }],
    ['duplicate capability', { capabilities: ['otlp_http_protobuf', 'otlp_grpc', 'otlp_grpc'] }],
    ['unknown capability', { capabilities: ['otlp_http_protobuf', 'otlp_grpc', 'zipkin'] }],
    ['missing endpoint', { otlpGrpcEndpoint: undefined }],
    ['missing header', { authorizationHeader: undefined }],
    ['wrong header', { authorizationHeader: 'X-HertzBeat-Token' }],
    ['unexpected field', { credential: 'must-not-be-accepted' }],
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

  it.each([
    ['overlong Collector identity', `${'c'.repeat(129)}`],
    ['control character in Collector identity', 'collector\neast']
  ])('degrades an invalid advertised %s', async (_label, collectorId) => {
    apiMessageGet.mockResolvedValue(page(summary('collector-east', availableIntake(collectorId))));

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
    apiMessageGet.mockResolvedValue(
      page(summary('collector-east', { ...unavailableIntake('intake_not_advertised'), collectorId: 'collector-west' }))
    );

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
    const base = _label.includes('unavailable') ? unavailableIntake('intake_not_advertised') : availableIntake();
    apiMessageGet.mockResolvedValue(page(summary('collector-east', { ...base, ...override })));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.intake).toEqual({ status: 'unavailable', errorCode: 'intake_advertisement_invalid' });
  });

  it('degrades only the malformed advertisement and never reflects rejected secret material', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const rejected = 'https://operator:plain_secret@rejected.example.com:4318?token=plain_secret';
    apiMessageGet.mockResolvedValue(
      page(
        summary('collector-bad', { ...availableIntake('collector-bad'), otlpHttpEndpoint: rejected }),
        summary('collector-good', availableIntake('collector-good'))
      )
    );

    const collectors = await loadInstrumentationCollectors();

    expect(collectors.map(item => item.intake.status)).toEqual(['unavailable', 'available']);
    expect(JSON.stringify(collectors[0]?.intake)).not.toContain('plain_secret');
    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('plain_secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('plain_secret');
  });

  it.each([
    ['unsupported legacy status', { status: 99 }],
    ['missing online evidence', { online: undefined, status: undefined }],
    ['boolean online contradicts legacy offline', { online: true, status: 1 }],
    ['boolean offline contradicts legacy online', { online: false, status: 0 }]
  ])('rejects %s instead of mapping unknown liveness to offline', async (_label, liveness) => {
    apiMessageGet.mockResolvedValue(page(summaryWithLiveness('collector-east', liveness)));

    await expect(loadInstrumentationCollectors()).rejects.toBeInstanceOf(CollectorContractError);
  });

  it.each([
    ['boolean online', { online: true, status: undefined }, true],
    ['boolean offline', { online: false, status: undefined }, false],
    ['legacy online', { online: undefined, status: 0 }, true],
    ['legacy offline', { online: undefined, status: 1 }, false],
    ['consistent online signals', { online: true, status: 0 }, true],
    ['consistent offline signals', { online: false, status: 1 }, false]
  ])('maps %s from authoritative liveness evidence', async (_label, liveness, expected) => {
    apiMessageGet.mockResolvedValue(page(summaryWithLiveness('collector-east', liveness)));

    const [collector] = await loadInstrumentationCollectors();

    expect(collector?.online).toBe(expected);
  });

  it('loads a Collector after row 200 for wizard selection, guide rendering, and detection context', async () => {
    const signal = new AbortController().signal;
    const firstPage = Array.from({ length: 200 }, (_, index) => summary(`collector-${index}`));
    apiMessageGet
      .mockResolvedValueOnce(collectorPage(firstPage, 0, 201, 2))
      .mockResolvedValueOnce(collectorPage([summary('collector-200', availableIntake('collector-200'))], 1, 201, 2));

    const collectors = await loadInstrumentationCollectors(signal);
    const selected = collectors.at(200);

    expect(collectors).toHaveLength(201);
    expect(selected?.collectorId).toBe('collector-200');
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/collector?pageIndex=0&pageSize=200', { signal });
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/api/collector?pageIndex=1&pageSize=200', { signal });
    if (!selected || selected.intake.status !== 'available') throw new Error('Expected available Collector');
    if (!selected.intake.otlpHttpEndpoint || !selected.intake.otlpGrpcEndpoint) {
      throw new Error('Expected both Collector endpoints');
    }
    const draft = flowDraft(selected.collectorId);
    const target = {
      collectorId: selected.intake.collectorId,
      otlpHttpEndpoint: selected.intake.otlpHttpEndpoint,
      otlpGrpcEndpoint: selected.intake.otlpGrpcEndpoint,
      authorizationHeader: selected.intake.authorizationHeader
    };
    expect(buildGuideRequest(draft, selected, target).collector.collectorId).toBe('collector-200');
    expect(buildDetectionRequest(draft, 1_710_000_000_000).collectorId).toBe('collector-200');
  });

  it.each([
    ['repeated page identity', collectorPage([summary('collector-200')], 0, 201, 2)],
    ['changed total evidence', collectorPage([summary('collector-200')], 1, 202, 2)],
    ['duplicate Collector identity', collectorPage([summary('collector-0')], 1, 201, 2)]
  ])('rejects %s instead of returning partial or scope-drifted inventory', async (_label, continuation) => {
    const firstPage = Array.from({ length: 200 }, (_, index) => summary(`collector-${index}`));
    apiMessageGet.mockResolvedValueOnce(collectorPage(firstPage, 0, 201, 2)).mockResolvedValueOnce(continuation);

    await expect(loadInstrumentationCollectors()).rejects.toThrow(/Collector/i);
  });

  it('rejects an excessive backend page count before issuing an unbounded request sequence', async () => {
    apiMessageGet.mockResolvedValueOnce(
      collectorPage(
        Array.from({ length: 200 }, (_, index) => summary(`collector-${index}`)),
        0,
        4_001,
        21
      )
    );

    await expect(loadInstrumentationCollectors()).rejects.toBeInstanceOf(CollectorContractError);
    expect(apiMessageGet).toHaveBeenCalledOnce();
  });

  it('classifies contract evidence separately from transport unavailability', () => {
    expect(collectorReadFailureKind(new CollectorContractError())).toBe('error');
    expect(collectorReadFailureKind(new ApiMessageError('invalid response', { status: 200 }))).toBe('error');
    expect(collectorReadFailureKind(new ApiMessageError('rejected request', { status: 400 }))).toBe('error');
    expect(collectorReadFailureKind(new ApiMessageError('service unavailable', { status: 503 }))).toBe('unavailable');
    expect(collectorReadFailureKind(new ApiMessageError('network failed', { cause: new Error('offline') }))).toBe(
      'unavailable'
    );
  });

  it('propagates a later-page failure instead of presenting the first page as complete', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => summary(`collector-${index}`));
    apiMessageGet
      .mockResolvedValueOnce(collectorPage(firstPage, 0, 201, 2))
      .mockRejectedValueOnce(new Error('Collector service unavailable'));

    await expect(loadInstrumentationCollectors()).rejects.toThrow('Collector service unavailable');
  });

  it('rejects a late continuation after cancellation instead of publishing retired inventory', async () => {
    const controller = new AbortController();
    const continuation = deferred<unknown>();
    const firstPage = Array.from({ length: 200 }, (_, index) => summary(`collector-${index}`));
    apiMessageGet.mockResolvedValueOnce(collectorPage(firstPage, 0, 201, 2)).mockReturnValueOnce(continuation.promise);

    const pending = loadInstrumentationCollectors(controller.signal);
    try {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      expect(apiMessageGet).toHaveBeenCalledTimes(2);
      controller.abort();
    } finally {
      continuation.resolve(collectorPage([summary('collector-200')], 1, 201, 2));
    }

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

function page(...content: unknown[]) {
  return collectorPage(content, 0, content.length, content.length ? 1 : 0);
}

function collectorPage(content: unknown[], number: number, totalElements: number, totalPages: number) {
  return { content, number, size: 200, totalElements, totalPages };
}

function summary(name: string, instrumentationIntake: unknown = unavailableIntake('intake_not_advertised', name)) {
  return {
    collector: { name, ip: name === 'collector-east' ? '10.0.0.8' : '10.0.0.9', status: 0 },
    instrumentationIntake
  };
}

function summaryWithoutIntake(name: string) {
  return { collector: { name, ip: '10.0.0.8', status: 0 } };
}

function summaryWithLiveness(name: string, liveness: { online?: boolean | undefined; status?: number | undefined }) {
  const value = summary(name);
  return { ...value, collector: { ...value.collector, ...liveness } };
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

function unavailableIntake(errorCode: string, collectorId = 'collector-east'): Record<string, unknown> {
  return {
    schemaVersion: 1,
    collectorId,
    state: 'unavailable',
    gateway: null,
    capabilities: [],
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: null,
    authorizationHeader: null,
    errorCode
  };
}

function flowDraft(collectorId: string): InstrumentationFlowDraft {
  return {
    environment: 'docker',
    platform: 'linux_amd64',
    selection: {
      language: 'go',
      framework: 'go_generic',
      method: 'sdk',
      environment: 'docker',
      platform: 'linux_amd64'
    },
    collectorId,
    serviceName: 'checkout-api',
    serviceNamespace: 'commerce',
    serviceEnvironment: 'prod'
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
