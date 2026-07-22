/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';

import { buildAlertListPath, loadAlertGroups, loadAlertSummary } from './alert-api';
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
});
