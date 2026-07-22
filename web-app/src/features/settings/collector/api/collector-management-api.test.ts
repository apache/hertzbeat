/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessageDelete, apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import { CollectorContractError, loadCollectorManagementPage, mutateCollectors } from './collector-management-api';

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
