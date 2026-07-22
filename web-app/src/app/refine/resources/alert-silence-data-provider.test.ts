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
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { AlertSilenceRequestFailure, type AlertSilence } from '@/features/alert/model/alert-silence-model';

type AlertSilenceApi = typeof import('@/features/alert/api/alert-silence-api');
const api = vi.hoisted(() => ({
  deleteAlertSilence: vi.fn<AlertSilenceApi['deleteAlertSilence']>(),
  loadAlertSilence: vi.fn<AlertSilenceApi['loadAlertSilence']>(),
  loadAlertSilences: vi.fn<AlertSilenceApi['loadAlertSilences']>(),
  saveAlertSilence: vi.fn<AlertSilenceApi['saveAlertSilence']>(),
  updateAlertSilenceEnabled: vi.fn<AlertSilenceApi['updateAlertSilenceEnabled']>()
}));
vi.mock('@/features/alert/api/alert-silence-api', async importOriginal => ({
  ...(await importOriginal<AlertSilenceApi>()),
  ...api
}));

import { alertSilenceDataProvider } from './alert-silence-data-provider';

const record: AlertSilence = {
  id: 7,
  name: 'Canonical',
  enable: true,
  matchAll: true,
  type: 0,
  times: null,
  labels: null,
  days: null,
  periodStart: null,
  periodEnd: null,
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};
const query = { search: '', pageIndex: 0, pageSize: 8 } as const;
const page = { content: [record], totalElements: 1, totalPages: 1, number: 0, size: 8 };
const draft = {
  name: 'Request',
  enable: true,
  matchAll: true,
  type: 0 as const,
  labelsText: '',
  days: [],
  periodStart: '2026-07-13T10:00',
  periodEnd: '2026-07-13T12:00'
};

describe('Alert Silence Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is read-only because the page controller is the only mutation transaction owner', async () => {
    api.loadAlertSilence.mockResolvedValue(record);
    api.loadAlertSilences.mockResolvedValue(page);
    api.saveAlertSilence.mockResolvedValue(undefined);
    api.updateAlertSilenceEnabled.mockResolvedValue(undefined);
    api.deleteAlertSilence.mockResolvedValue(undefined);

    await expect(
      alertSilenceDataProvider.create({ resource: 'alert-silences', variables: draft })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_CREATE_UNSUPPORTED', statusCode: 405 });
    await expect(
      alertSilenceDataProvider.update({
        resource: 'alert-silences',
        id: 7,
        variables: { draft: { ...draft, id: 7 }, query }
      })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_UPDATE_UNSUPPORTED', statusCode: 405 });
    await expect(
      alertSilenceDataProvider.deleteOne({ resource: 'alert-silences', id: 7, variables: { query } })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_DELETE_UNSUPPORTED', statusCode: 405 });
    await expect(
      alertSilenceDataProvider.custom?.({ url: '/api/alert/silence', method: 'post', payload: draft })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_CUSTOM_ACTION_UNSUPPORTED', statusCode: 405 });

    expect(api.loadAlertSilence).not.toHaveBeenCalled();
    expect(api.loadAlertSilences).not.toHaveBeenCalled();
    expect(api.saveAlertSilence).not.toHaveBeenCalled();
    expect(api.updateAlertSilenceEnabled).not.toHaveBeenCalled();
    expect(api.deleteAlertSilence).not.toHaveBeenCalled();
  });

  it('owns only the named resource and exact server list query', async () => {
    api.loadAlertSilences.mockResolvedValue(page);
    await expect(
      alertSilenceDataProvider.getList<AlertSilence>({
        resource: 'alert-silences',
        pagination: { currentPage: 1, pageSize: 8, mode: 'server' },
        filters: [{ field: 'search', operator: 'contains', value: ' prod ' }]
      })
    ).resolves.toEqual({ data: [record], total: 1 });
    expect(api.loadAlertSilences).toHaveBeenCalledWith({ search: 'prod', pageIndex: 0, pageSize: 8 });
    await expect(alertSilenceDataProvider.getList({ resource: 'labels' })).rejects.toMatchObject({
      code: 'ALERT_SILENCE_RESOURCE_UNSUPPORTED'
    });
  });

  it('keeps missing, unavailable, and invalid-contract failures distinguishable', async () => {
    api.loadAlertSilence.mockRejectedValueOnce(new AlertSilenceRequestFailure('missing', 'uncertain'));
    await expect(alertSilenceDataProvider.getOne({ resource: 'alert-silences', id: 7 })).rejects.toMatchObject({
      code: 'ALERT_SILENCE_MISSING',
      statusCode: 404
    });
    api.loadAlertSilence.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    await expect(alertSilenceDataProvider.getOne({ resource: 'alert-silences', id: 7 })).rejects.toMatchObject({
      code: 'ALERT_SILENCE_UNAVAILABLE',
      statusCode: 503
    });
    api.loadAlertSilence.mockResolvedValueOnce({ ...record, id: 8 });
    await expect(alertSilenceDataProvider.getOne({ resource: 'alert-silences', id: 7 })).rejects.toMatchObject({
      code: 'ALERT_SILENCE_CANONICAL_IDENTITY_INVALID',
      statusCode: 502
    });
  });

  it('preserves a cause-bearing read as redacted network evidence', async () => {
    api.loadAlertSilence.mockRejectedValue(
      new ApiMessageError('token=private-silence-message', {
        status: 422,
        cause: new TypeError('private-silence-cause')
      })
    );

    let error: unknown;
    try {
      await alertSilenceDataProvider.getOne({ resource: 'alert-silences', id: 7 });
    } catch (reason) {
      error = reason;
    }
    expect(error).toMatchObject({
      kind: 'network',
      statusCode: 0,
      httpStatus: undefined,
      code: 'NETWORK_REQUEST_FAILED'
    });
    expect(JSON.stringify(error)).not.toContain('private-silence');
  });
});
