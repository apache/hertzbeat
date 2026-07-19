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
import type { AlertSilence } from '@/features/alert/alert-silence-model';

type AlertSilenceApi = typeof import('@/features/alert/alert-silence-api');
const api = vi.hoisted(() => ({
  deleteAlertSilence: vi.fn<AlertSilenceApi['deleteAlertSilence']>(),
  loadAlertSilence: vi.fn<AlertSilenceApi['loadAlertSilence']>(),
  loadAlertSilences: vi.fn<AlertSilenceApi['loadAlertSilences']>(),
  saveAlertSilence: vi.fn<AlertSilenceApi['saveAlertSilence']>(),
  updateAlertSilenceEnabled: vi.fn<AlertSilenceApi['updateAlertSilenceEnabled']>()
}));
vi.mock('@/features/alert/alert-silence-api', async importOriginal => ({
  ...(await importOriginal<AlertSilenceApi>()),
  ...api
}));

import { alertSilenceCreateActionUrl, alertSilenceDataProvider } from './alert-silence-data-provider';
import inputSource from './alert-silence-data-provider-input.ts?raw';
import providerSource from './alert-silence-data-provider.ts?raw';

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

  it('creates only through an explicit custom void action without guessing an id', async () => {
    api.saveAlertSilence.mockResolvedValue(undefined);
    await expect(
      alertSilenceDataProvider.custom?.({
        url: alertSilenceCreateActionUrl,
        method: 'post',
        payload: draft
      })
    ).resolves.toEqual({ data: { acknowledged: true } });
    expect(api.loadAlertSilence).not.toHaveBeenCalled();
    await expect(
      alertSilenceDataProvider.create({ resource: 'alert-silences', variables: draft })
    ).rejects.toMatchObject({ statusCode: 405 });
  });

  it('strips unknown draft and query fields without weakening identity checks', async () => {
    api.saveAlertSilence.mockResolvedValue(undefined);
    api.loadAlertSilence.mockResolvedValue(record);
    api.loadAlertSilences.mockResolvedValue(page);

    await expect(
      alertSilenceDataProvider.update<AlertSilence>({
        resource: 'alert-silences',
        id: 7,
        variables: {
          draft: { ...draft, id: 7, ignored: 'backend-only' },
          query: { ...query, ignored: 'backend-only' },
          ignored: 'adapter-only'
        }
      })
    ).resolves.toEqual({ data: record });
    expect(api.saveAlertSilence).toHaveBeenCalledWith({ ...draft, id: 7 });
    expect(api.loadAlertSilences).toHaveBeenCalledWith(query);

    await expect(
      alertSilenceDataProvider.update({
        resource: 'alert-silences',
        id: 7,
        variables: { draft: { ...draft, id: 8 }, query }
      })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_VARIABLES_INVALID', statusCode: 400 });
    await expect(
      alertSilenceDataProvider.custom?.({
        url: alertSilenceCreateActionUrl,
        method: 'post',
        payload: { ...draft, id: 7 }
      })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_VARIABLES_INVALID', statusCode: 400 });
  });

  it('updates and toggles from an exact canonical identity with authoritative list proof', async () => {
    api.saveAlertSilence.mockResolvedValue(undefined);
    api.loadAlertSilence.mockResolvedValue(record);
    api.loadAlertSilences.mockResolvedValue(page);
    await expect(
      alertSilenceDataProvider.update<AlertSilence>({
        resource: 'alert-silences',
        id: 7,
        variables: { draft: { ...draft, id: 7 }, query }
      })
    ).resolves.toEqual({ data: record });
    expect(api.saveAlertSilence).toHaveBeenCalledWith({ ...draft, id: 7 });
    expect(api.loadAlertSilences).toHaveBeenCalledWith(query);

    api.loadAlertSilence.mockClear();
    api.loadAlertSilences.mockClear();
    await expect(
      alertSilenceDataProvider.update<AlertSilence>({
        resource: 'alert-silences',
        id: 7,
        variables: { operation: 'toggle', enable: false, query }
      })
    ).resolves.toEqual({ data: record });
    expect(api.loadAlertSilence).toHaveBeenCalledTimes(2);
    expect(api.updateAlertSilenceEnabled).toHaveBeenCalledWith(record, false);
    expect(api.loadAlertSilences).toHaveBeenCalledWith(query);
  });

  it('requires missing detail and authoritative list evidence after delete', async () => {
    api.loadAlertSilence
      .mockResolvedValueOnce(record)
      .mockRejectedValueOnce(new ApiMessageError('missing', { code: 3, status: 200 }));
    api.deleteAlertSilence.mockResolvedValue(undefined);
    api.loadAlertSilences.mockResolvedValue({ ...page, content: [], totalElements: 0, totalPages: 0 });
    await expect(
      alertSilenceDataProvider.deleteOne<AlertSilence>({
        resource: 'alert-silences',
        id: 7,
        variables: { query }
      })
    ).resolves.toEqual({ data: record });

    api.loadAlertSilence.mockReset().mockResolvedValue(record);
    await expect(
      alertSilenceDataProvider.deleteOne<AlertSilence>({
        resource: 'alert-silences',
        id: 7,
        variables: { query }
      })
    ).rejects.toMatchObject({ code: 'ALERT_SILENCE_DELETE_NOT_CONFIRMED' });
  });

  it('keeps missing, unavailable, and invalid-contract failures distinguishable', async () => {
    api.loadAlertSilence.mockRejectedValueOnce(new ApiMessageError('missing', { code: 3, status: 200 }));
    await expect(alertSilenceDataProvider.getOne({ resource: 'alert-silences', id: 7 })).rejects.toMatchObject({
      code: 'ALERT_SILENCE_MISSING',
      statusCode: 404
    });
    api.loadAlertSilence.mockRejectedValueOnce(new ApiMessageError('gateway', { status: 503 }));
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

  it('keeps Refine orchestration small and delegates runtime input validation', () => {
    const sourceLines = providerSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('//'));

    expect(sourceLines.length).toBeLessThanOrEqual(200);
    expect(providerSource).not.toMatch(/function\s+(?:objectValue|readQuery|hasValidDraft\w*)\s*\(/);
    expect(providerSource).not.toContain('as unknown as TData');
    expect(providerSource).toContain("from '@/shared/refine/refine-provider-data'");
    expect(inputSource).toContain("from 'zod'");
    expect(inputSource).toContain('schema.safeParse(value)');
    expect(inputSource).not.toMatch(/function\s+(?:objectValue|hasValidDraft\w*)\s*\(/);
  });
});
