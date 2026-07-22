/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import {
  CollectorContractError,
  clearCollectorInstrumentationIntake,
  loadCollectorManagementPage,
  loadCollectorMutationProofPage,
  mutateCollectors,
  saveCollectorInstrumentationIntake
} from './collector-management-api';

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePut: vi.fn()
}));

const get = vi.mocked(apiMessageGet);
const put = vi.mocked(apiMessagePut);
const remove = vi.mocked(apiMessageDelete);

describe('Collector management API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the requested backend page and projects the exact safe summary fields', async () => {
    const signal = new AbortController().signal;
    get.mockResolvedValue(page([summary('edge west')]));

    await expect(loadCollectorManagementPage({ name: ' edge ', pageIndex: 2, pageSize: 15 }, signal)).resolves.toEqual({
      content: [
        expect.objectContaining({
          name: 'edge west',
          online: true,
          immutable: false,
          pinMonitorNum: 2,
          dispatchMonitorNum: 3,
          instrumentationIntake: expect.objectContaining({ status: 'unavailable' })
        })
      ],
      number: 2,
      size: 15,
      totalElements: 31,
      totalPages: 3
    });
    expect(get).toHaveBeenCalledWith('/api/collector?pageIndex=2&pageSize=15&name=edge', { signal });
  });

  it('rejects missing mandatory intake and unexpected secret-bearing Collector fields', async () => {
    const withoutIntake = summary('edge') as Record<string, unknown>;
    delete withoutIntake.instrumentationIntake;
    get.mockResolvedValueOnce(page([withoutIntake]));
    await expect(loadCollectorManagementPage({ name: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(
      CollectorContractError
    );

    get.mockResolvedValueOnce(
      page([{ ...summary('edge'), collector: { ...summary('edge').collector, token: 'must-not-enter-ui' } }])
    );
    await expect(loadCollectorManagementPage({ name: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(
      CollectorContractError
    );
  });

  it('does not retain secret-bearing runtime diagnostics in collector query data', async () => {
    get.mockResolvedValue(
      page([
        {
          ...summary('edge'),
          runtimeStatus: {
            schemaVersion: 2,
            state: 'RUNNING',
            lastError: 'authorization=must-not-enter-query-data'
          }
        }
      ])
    );

    const result = await loadCollectorManagementPage({ name: '', pageIndex: 2, pageSize: 15 });

    expect(result.content[0]).not.toHaveProperty('runtimeStatus');
    expect(JSON.stringify(result)).not.toContain('must-not-enter-query-data');
  });

  it('accepts an out-of-range empty Spring page only for authoritative mutation proof', async () => {
    const response = { content: [], totalElements: 16, totalPages: 2, number: 2, size: 8 };
    get.mockResolvedValue(response);

    await expect(loadCollectorManagementPage({ name: '', pageIndex: 2, pageSize: 8 })).rejects.toBeInstanceOf(
      CollectorContractError
    );
    await expect(loadCollectorMutationProofPage({ name: '', pageIndex: 2, pageSize: 8 })).resolves.toEqual(response);
  });

  it('uses repeated encoded collectors parameters for online, offline, and delete', async () => {
    put.mockResolvedValue(undefined);
    remove.mockResolvedValue(undefined);

    await mutateCollectors('online', [' edge/a ', 'west']);
    await mutateCollectors('offline', ['edge/a']);
    await mutateCollectors('delete', ['edge/a', 'west']);

    expect(put).toHaveBeenNthCalledWith(1, '/api/collector/online?collectors=edge%2Fa&collectors=west', null);
    expect(put).toHaveBeenNthCalledWith(2, '/api/collector/offline?collectors=edge%2Fa', null);
    expect(remove).toHaveBeenCalledWith('/api/collector?collectors=edge%2Fa&collectors=west');
  });

  it('saves and clears the exact safe intake advertisement at the encoded Collector path', async () => {
    const available = intakeAvailable('edge/west');
    const unavailable = intakeUnavailable('edge/west');
    put.mockResolvedValueOnce(available);
    remove.mockResolvedValueOnce(unavailable);
    const request = {
      schemaVersion: 1 as const,
      gateway: 'server' as const,
      capabilities: ['otlp_grpc'] as const,
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
    };

    await expect(saveCollectorInstrumentationIntake(' edge/west ', request)).resolves.toEqual({
      status: 'available',
      schemaVersion: 1,
      collectorId: 'edge/west',
      gateway: 'server',
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
      authorizationHeader: 'Authorization'
    });
    await expect(clearCollectorInstrumentationIntake('edge/west')).resolves.toEqual({
      status: 'unavailable',
      errorCode: 'intake_not_advertised'
    });

    expect(put).toHaveBeenCalledWith('/api/collector/edge%2Fwest/instrumentation-intake', request);
    expect(remove).toHaveBeenCalledWith('/api/collector/edge%2Fwest/instrumentation-intake');
  });

  it('rejects unsafe intake requests and mismatched response identities without publishing raw values', async () => {
    const unsafe = {
      schemaVersion: 1,
      gateway: 'server',
      capabilities: ['otlp_grpc'],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: 'https://telemetry.example.test:4317?token=must-not-enter-request'
    };
    await expect(saveCollectorInstrumentationIntake('edge', unsafe)).rejects.toBeInstanceOf(CollectorContractError);
    expect(put).not.toHaveBeenCalled();

    put.mockResolvedValue(intakeAvailable('other'));
    await expect(
      saveCollectorInstrumentationIntake('edge', {
        schemaVersion: 1,
        gateway: 'server',
        capabilities: ['otlp_grpc'],
        otlpHttpEndpoint: null,
        otlpGrpcEndpoint: 'https://telemetry.example.test:4317'
      })
    ).rejects.toBeInstanceOf(CollectorContractError);
  });

  it.each([[[]], [['']], [['main-default-collector']], [['edge', 'edge']]])(
    'rejects unsafe or immutable mutation target set %j before transport',
    collectors => {
      expect(() => mutateCollectors('delete', collectors)).toThrow(CollectorContractError);
      expect(put).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    }
  );
});

function page(content: unknown[]) {
  return { content, totalElements: 31, totalPages: 3, number: 2, size: 15 };
}

function summary(name: string) {
  return {
    collector: {
      id: 7,
      name,
      ip: '10.0.0.7',
      version: '2.0.0',
      status: 0,
      mode: 'public',
      creator: 'system',
      modifier: 'system',
      gmtCreate: '2026-07-20T09:00:00',
      gmtUpdate: '2026-07-22T10:00:00'
    },
    pinMonitorNum: 2,
    dispatchMonitorNum: 3,
    runtimeStatus: null,
    runtimeStatusReportedAt: null,
    instrumentationIntake: {
      schemaVersion: 1,
      collectorId: name,
      state: 'unavailable',
      gateway: null,
      capabilities: [],
      otlpHttpEndpoint: null,
      otlpGrpcEndpoint: null,
      authorizationHeader: null,
      errorCode: 'intake_not_advertised'
    }
  };
}

function intakeAvailable(collectorId: string) {
  return {
    schemaVersion: 1,
    collectorId,
    state: 'available',
    gateway: 'server',
    capabilities: ['otlp_grpc'],
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: 'https://telemetry.example.test:4317',
    authorizationHeader: 'Authorization',
    errorCode: null
  };
}

function intakeUnavailable(collectorId: string) {
  return {
    schemaVersion: 1,
    collectorId,
    state: 'unavailable',
    gateway: null,
    capabilities: [],
    otlpHttpEndpoint: null,
    otlpGrpcEndpoint: null,
    authorizationHeader: null,
    errorCode: 'intake_not_advertised'
  };
}
