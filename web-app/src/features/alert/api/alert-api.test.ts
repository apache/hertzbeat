/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageDelete, apiMessageGet, apiMessagePut, openBrowserEventStream } = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePut: vi.fn(),
  openBrowserEventStream: vi.fn()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete,
  apiMessageGet,
  apiMessagePut
}));
vi.mock('@/core/http/event-stream', () => ({ openBrowserEventStream }));

import { ApiMessageError } from '@/core/http/api-message';

import {
  buildAlertListPath,
  deleteAlertGroups,
  loadAlertGroupEvidence,
  loadAlertGroups,
  loadAlertSummary,
  openAlertGroupStream,
  updateAlertGroupStatus
} from './alert-api';
import { AlertContractError, AlertRequestFailure } from '../model/alert-model';

const query = {
  search: '',
  status: '',
  severity: '',
  serviceName: 'checkout',
  serviceNamespace: 'payments',
  environment: 'prod',
  pageIndex: 0,
  pageSize: 8
} as const;

describe('alert API', () => {
  beforeEach(() => vi.resetAllMocks());

  it('owns the backend list path and omits empty filters', () => {
    expect(
      buildAlertListPath({
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        serviceName: 'checkout-api',
        serviceNamespace: 'payments',
        environment: 'prod',
        pageIndex: 0,
        pageSize: 8
      })
    ).toBe(
      '/api/alerts/group?pageIndex=0&pageSize=8&search=checkout&status=firing&severity=critical' +
        '&serviceName=checkout-api&serviceNamespace=payments&environment=prod&sort=gmtUpdate&order=desc'
    );
    expect(
      buildAlertListPath({
        search: '',
        status: '',
        severity: '',
        serviceName: '',
        serviceNamespace: '',
        environment: '',
        pageIndex: 1,
        pageSize: 15
      })
    ).toBe('/api/alerts/group?pageIndex=1&pageSize=15&sort=gmtUpdate&order=desc');
  });

  it('parses and allowlists summary data on read', async () => {
    apiMessageGet.mockResolvedValue({
      total: 2,
      dealNum: 1,
      rate: 50,
      priorityWarningNum: 1,
      priorityCriticalNum: 0,
      priorityEmergencyNum: 0,
      leaked: 'ignored'
    });
    await expect(loadAlertSummary()).resolves.toEqual({
      total: 2,
      dealNum: 1,
      rate: 50,
      priorityWarningNum: 1,
      priorityCriticalNum: 0,
      priorityEmergencyNum: 0
    });
    expect(apiMessageGet).toHaveBeenCalledWith('/api/alerts/summary');
  });

  it('forwards caller cancellation to summary and list transports', async () => {
    const signal = new AbortController().signal;
    apiMessageGet
      .mockResolvedValueOnce({
        total: 2,
        dealNum: 1,
        rate: 50,
        priorityWarningNum: 1,
        priorityCriticalNum: 0,
        priorityEmergencyNum: 0
      })
      .mockResolvedValueOnce({
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 8
      });

    await loadAlertSummary(signal);
    await loadAlertGroups(query, signal);

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/alerts/summary', { signal });
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, buildAlertListPath(query), { signal });
  });

  it('parses exact requested page evidence and rejects null or malformed reads', async () => {
    apiMessageGet.mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 8
    });
    await expect(loadAlertGroups(query)).resolves.toEqual({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 8
    });
    expect(apiMessageGet).toHaveBeenCalledWith(
      '/api/alerts/group?pageIndex=0&pageSize=8&serviceName=checkout&serviceNamespace=payments' +
        '&environment=prod&sort=gmtUpdate&order=desc'
    );

    apiMessageGet.mockResolvedValueOnce(null);
    await expect(loadAlertGroups(query)).rejects.toBeInstanceOf(AlertContractError);
    apiMessageGet.mockResolvedValueOnce({ total: '0' });
    await expect(loadAlertSummary()).rejects.toBeInstanceOf(AlertContractError);
  });

  it('normalizes transport failures from both endpoints before leaving the API', async () => {
    apiMessageGet.mockRejectedValueOnce(new ApiMessageError('private summary failure', { status: 503 }));
    const summary = loadAlertSummary();
    await expect(summary).rejects.toBeInstanceOf(AlertRequestFailure);
    await expect(summary).rejects.toMatchObject({ kind: 'unavailable' });

    apiMessageGet.mockRejectedValueOnce(new ApiMessageError('private list failure', { status: 400 }));
    await expect(loadAlertGroups(query)).rejects.toMatchObject({ kind: 'error' });
  });

  it('owns the group-delete path and rejects invalid ids before transport', async () => {
    apiMessageDelete.mockResolvedValue(undefined);

    await expect(deleteAlertGroups([9, 7, 9])).resolves.toBeUndefined();
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/alerts/group?ids=7&ids=9');

    await expect(deleteAlertGroups([0])).rejects.toBeInstanceOf(AlertContractError);
    expect(apiMessageDelete).toHaveBeenCalledTimes(1);
  });

  it('loads one canonical evidence snapshot for unique positive ids up to 100', async () => {
    apiMessageGet.mockResolvedValue({
      groups: [
        { id: 7, status: 'firing' },
        { id: 9, status: 'resolved' }
      ],
      missingIds: [],
      observedAt: 1_785_000_000_000
    });

    await expect(loadAlertGroupEvidence([9, 7, 9])).resolves.toEqual({
      groups: [
        { id: 7, status: 'firing' },
        { id: 9, status: 'resolved' }
      ],
      missingIds: [],
      observedAt: 1_785_000_000_000
    });
    expect(apiMessageGet).toHaveBeenCalledOnce();
    expect(apiMessageGet).toHaveBeenCalledWith('/api/alerts/group/evidence?ids=7&ids=9');

    vi.clearAllMocks();
    const maximumIds = Array.from({ length: 100 }, (_value, index) => index + 1);
    apiMessageGet.mockResolvedValueOnce({
      groups: maximumIds.map(id => ({ id, status: 'resolved' })),
      missingIds: [],
      observedAt: 1_785_000_000_001
    });
    const maximumEvidence = await loadAlertGroupEvidence(maximumIds);
    expect(maximumEvidence.groups).toHaveLength(100);
    expect(maximumEvidence.missingIds).toEqual([]);
    expect(apiMessageGet).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    await expect(
      loadAlertGroupEvidence(Array.from({ length: 101 }, (_value, index) => index + 1))
    ).rejects.toBeInstanceOf(AlertContractError);
    expect(apiMessageGet).not.toHaveBeenCalled();
  });

  it('preserves permission and invalid-contract evidence failures', async () => {
    apiMessageGet.mockRejectedValueOnce(new ApiMessageError('private evidence failure', { status: 403 }));
    await expect(loadAlertGroupEvidence([7])).rejects.toMatchObject({ kind: 'permission' });

    apiMessageGet.mockResolvedValueOnce({
      groups: [{ id: 8, status: 'resolved' }],
      missingIds: [],
      observedAt: 1_785_000_000_000
    });
    await expect(loadAlertGroupEvidence([7])).rejects.toBeInstanceOf(AlertContractError);
  });

  it('owns the allowlisted group-status path and canonicalizes ids before transport', async () => {
    apiMessagePut.mockResolvedValue(undefined);

    await expect(updateAlertGroupStatus([9, 7, 9], 'resolved')).resolves.toBeUndefined();
    expect(apiMessagePut).toHaveBeenCalledWith('/api/alerts/group/status/resolved?ids=7&ids=9', null);

    await expect(updateAlertGroupStatus([7], 'firing')).resolves.toBeUndefined();
    expect(apiMessagePut).toHaveBeenLastCalledWith('/api/alerts/group/status/firing?ids=7', null);

    await expect(updateAlertGroupStatus([11], 'acknowledged')).resolves.toBeUndefined();
    expect(apiMessagePut).toHaveBeenLastCalledWith('/api/alerts/group/status/acknowledged?ids=11', null);

    await expect(updateAlertGroupStatus([], 'resolved')).rejects.toBeInstanceOf(AlertContractError);
    await expect(updateAlertGroupStatus([7], 'pending' as 'resolved')).rejects.toBeInstanceOf(AlertContractError);
    expect(apiMessagePut).toHaveBeenCalledTimes(3);
  });

  it('owns the alert event stream path and projects only safe notification evidence', () => {
    const handlers = {
      onOpen: vi.fn(),
      onAlert: vi.fn(),
      onMutation: vi.fn(),
      onRetrying: vi.fn(),
      onUnavailable: vi.fn()
    };

    openAlertGroupStream(handlers);
    expect(openBrowserEventStream).toHaveBeenCalledWith('/api/alert/sse/subscribe', {
      eventNames: ['ALERT_EVENT', 'ALERT_GROUP_MUTATION'],
      onOpen: handlers.onOpen,
      onRetrying: handlers.onRetrying,
      onUnavailable: handlers.onUnavailable,
      onEvent: expect.any(Function)
    });

    const transport = openBrowserEventStream.mock.calls[0]?.[1] as
      { onEvent: (name: string, data: string) => void } | undefined;
    transport?.onEvent(
      'ALERT_EVENT',
      JSON.stringify({ id: 7, status: 'firing', content: 'private alert body', labels: { token: 'private' } })
    );
    expect(handlers.onAlert).toHaveBeenCalledOnce();
    expect(handlers.onAlert).toHaveBeenCalledWith({ id: 7, status: 'firing' });

    transport?.onEvent('ALERT_EVENT', 'private malformed body');
    expect(handlers.onAlert).toHaveBeenLastCalledWith(null);

    transport?.onEvent('ALERT_GROUP_MUTATION', JSON.stringify({ groupId: 7, operation: 'status' }));
    expect(handlers.onMutation).toHaveBeenCalledOnce();
    expect(handlers.onAlert).toHaveBeenCalledTimes(2);
  });
});
