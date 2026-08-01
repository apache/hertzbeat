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

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';
import { StatusOrgNotFoundError } from '../../shared/status-error-model';

import {
  loadPublicStatusComponents,
  loadPublicStatusIncidents,
  loadPublicStatusOrg,
  publicStatusIncidentPageSize
} from './public-status-api';
import { PublicStatusContractError } from './public-status-schema';

describe('public status API', () => {
  const range = { year: 2026, startTime: 1_767_225_600_000, endTime: null };
  const historicalRange = { year: 2025, startTime: 1_735_689_600_000, endTime: 1_767_225_599_999 };

  beforeEach(() => {
    apiMessageGet.mockReset();
  });

  it('uses the established public status queries', async () => {
    apiMessageGet
      .mockResolvedValueOnce(orgResponse(0))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    await loadPublicStatusOrg();
    await loadPublicStatusComponents();
    await loadPublicStatusIncidents(range);

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/status/page/public/org');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/api/status/page/public/component');
    expect(apiMessageGet).toHaveBeenNthCalledWith(
      3,
      '/api/status/page/public/incident?pageIndex=0&pageSize=20&startTime=1767225600000'
    );
  });

  it('maps the backend component wrapper into the public view contract', async () => {
    apiMessageGet.mockResolvedValueOnce([
      {
        info: { id: 1, name: 'API', description: 'Public API', state: 0 },
        history: []
      }
    ]);

    await expect(loadPublicStatusComponents()).resolves.toEqual([
      {
        id: 1,
        name: 'API',
        description: 'Public API',
        state: 'healthy',
        history: []
      }
    ]);
  });

  it('preserves public organization, component history and incident timeline evidence', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        name: 'HertzBeat',
        description: 'Status',
        home: 'https://hertzbeat.apache.org',
        logo: '/logo.svg',
        feedback: 'ops@example.test',
        state: 0
      })
      .mockResolvedValueOnce([
        {
          info: { id: 1, name: 'API', state: 0 },
          history: [
            {
              componentId: 1,
              state: 0,
              timestamp: 1_700_000_000_000,
              uptime: 0.995,
              normal: 86_000,
              abnormal: 400,
              unknowing: 0
            }
          ]
        }
      ])
      .mockResolvedValueOnce({
        content: [
          {
            id: 2,
            name: 'Gateway latency',
            state: 1,
            components: [{ id: 1, name: 'API', state: 1 }],
            contents: [
              {
                id: 3,
                incidentId: 2,
                message: 'Mitigation in progress',
                state: 2,
                timestamp: 1_700_000_100_000
              }
            ]
          }
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20
      });

    await expect(loadPublicStatusOrg()).resolves.toMatchObject({
      home: 'https://hertzbeat.apache.org',
      logo: '/logo.svg',
      feedback: 'ops@example.test'
    });
    await expect(loadPublicStatusComponents()).resolves.toMatchObject([
      {
        history: [
          {
            uptime: 0.995,
            normal: 86_000,
            abnormal: 400,
            unknowing: 0
          }
        ]
      }
    ]);
    await expect(loadPublicStatusIncidents(range)).resolves.toMatchObject({
      content: [
        {
          components: [{ id: 1, name: 'API', state: 'incident' }],
          contents: [{ message: 'Mitigation in progress', state: 'monitoring' }]
        }
      ]
    });
  });

  it('treats the backend empty optional feedback value as unconfigured', async () => {
    apiMessageGet.mockResolvedValueOnce({
      ...orgResponse(0),
      feedback: '',
      color: '#5b6fd8'
    });

    await expect(loadPublicStatusOrg()).resolves.toEqual({
      ...orgResponse(0),
      state: 'healthy',
      color: '#5b6fd8'
    });
  });

  it('maps every backend state domain into stable public status values', async () => {
    apiMessageGet
      .mockResolvedValueOnce(orgResponse(0))
      .mockResolvedValueOnce(orgResponse(1))
      .mockResolvedValueOnce(orgResponse(2))
      .mockResolvedValueOnce(orgResponse(9))
      .mockResolvedValueOnce([
        { info: { id: 1, name: 'Healthy', state: 0 }, history: [] },
        { info: { id: 2, name: 'Incident', state: 1 }, history: [] },
        { info: { id: 3, name: 'Unknown', state: 2 }, history: [] },
        { info: { id: 4, name: 'Future', state: 9 }, history: [] }
      ])
      .mockResolvedValueOnce({
        content: [
          incident(1, 'Investigating', 0),
          incident(2, 'Identified', 1),
          incident(3, 'Monitoring', 2),
          incident(4, 'Resolved', 3),
          incident(5, 'Future', 9)
        ],
        totalElements: 5,
        totalPages: 1,
        number: 0,
        size: 20
      });

    await expect(loadPublicStatusOrg()).resolves.toMatchObject({ state: 'healthy' });
    await expect(loadPublicStatusOrg()).resolves.toMatchObject({ state: 'degraded' });
    await expect(loadPublicStatusOrg()).resolves.toMatchObject({ state: 'incident' });
    await expect(loadPublicStatusOrg()).resolves.toMatchObject({ state: 'unknown' });
    await expect(loadPublicStatusComponents()).resolves.toEqual([
      { id: 1, name: 'Healthy', state: 'healthy', history: [] },
      { id: 2, name: 'Incident', state: 'incident', history: [] },
      { id: 3, name: 'Unknown', state: 'unknown', history: [] },
      { id: 4, name: 'Future', state: 'unknown', history: [] }
    ]);
    await expect(loadPublicStatusIncidents(range)).resolves.toMatchObject({
      content: [
        { id: 1, name: 'Investigating', state: 'investigating' },
        { id: 2, name: 'Identified', state: 'identified' },
        { id: 3, name: 'Monitoring', state: 'monitoring' },
        { id: 4, name: 'Resolved', state: 'resolved' },
        { id: 5, name: 'Future', state: 'unknown' }
      ]
    });
  });

  it('loads every incident page before returning public status evidence', async () => {
    apiMessageGet
      .mockResolvedValueOnce(
        incidentPage(
          0,
          2,
          21,
          Array.from({ length: 20 }, (_, index) => index + 1)
        )
      )
      .mockResolvedValueOnce(incidentPage(1, 2, 21, [21]));

    const result = await loadPublicStatusIncidents(historicalRange);

    expect(result.content.map(incident => incident.id)).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
    expect(result.totalElements).toBe(21);
    expect(apiMessageGet).toHaveBeenNthCalledWith(
      1,
      '/api/status/page/public/incident?pageIndex=0&pageSize=20&startTime=1735689600000&endTime=1767225599999'
    );
    expect(apiMessageGet).toHaveBeenNthCalledWith(
      2,
      '/api/status/page/public/incident?pageIndex=1&pageSize=20&startTime=1735689600000&endTime=1767225599999'
    );
  });

  it('stops a serial incident scan when its caller cancels after the current page', async () => {
    const controller = new AbortController();
    apiMessageGet.mockImplementationOnce(() => {
      controller.abort(new DOMException('private caller reason', 'AbortError'));
      return Promise.resolve(
        incidentPage(
          0,
          2,
          21,
          Array.from({ length: 20 }, (_, index) => index + 1)
        )
      );
    });

    await expect(loadPublicStatusIncidents(range, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Request aborted'
    });
    expect(apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it('rejects a single first page whose positive size differs from the requested size', async () => {
    apiMessageGet.mockResolvedValueOnce({
      ...incidentPage(0, 1, 1, [1]),
      size: publicStatusIncidentPageSize + 1
    });

    await expect(loadPublicStatusIncidents(range)).rejects.toBeInstanceOf(PublicStatusContractError);
    expect(apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it('rejects incident pages that change pagination evidence mid-read', async () => {
    apiMessageGet
      .mockResolvedValueOnce(
        incidentPage(
          0,
          2,
          21,
          Array.from({ length: 20 }, (_, index) => index + 1)
        )
      )
      .mockResolvedValueOnce(incidentPage(0, 2, 21, [21]));

    await expect(loadPublicStatusIncidents(range)).rejects.toBeInstanceOf(PublicStatusContractError);
  });

  it('fails unavailable instead of issuing an unbounded number of incident requests', async () => {
    apiMessageGet.mockResolvedValueOnce(
      incidentPage(
        0,
        101,
        2_020,
        Array.from({ length: 20 }, (_, index) => index + 1)
      )
    );

    await expect(loadPublicStatusIncidents(range)).rejects.toBeInstanceOf(PublicStatusContractError);
    expect(apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed public status resources', async () => {
    apiMessageGet.mockResolvedValueOnce({ ...orgResponse(0), token: 'secret' });

    await expect(loadPublicStatusOrg()).rejects.toBeInstanceOf(PublicStatusContractError);
  });

  it.each([
    ['home', 'javascript:alert(1)'],
    ['logo', 'data:image/svg+xml,unsafe'],
    ['feedback', 'javascript:alert(1)'],
    ['home', '//example.test/status']
  ])('rejects an unsafe organization %s link', async (field, value) => {
    apiMessageGet.mockResolvedValueOnce({ ...orgResponse(0), [field]: value });

    await expect(loadPublicStatusOrg()).rejects.toBeInstanceOf(PublicStatusContractError);
  });

  it('normalizes organization-not-found transport evidence before leaving the API', async () => {
    apiMessageGet.mockRejectedValue(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 })
    );

    await expect(loadPublicStatusOrg()).rejects.toBeInstanceOf(StatusOrgNotFoundError);
  });
});

function incidentPage(number: number, totalPages: number, totalElements: number, ids: number[]) {
  return {
    content: ids.map(id => incident(id, `Incident ${id}`, 1)),
    totalElements,
    totalPages,
    number,
    size: publicStatusIncidentPageSize
  };
}

function orgResponse(state: number) {
  return { name: 'HertzBeat', description: 'Status', home: '/', logo: '/logo.svg', state };
}

function incident(id: number, name: string, state: number) {
  return { id, name, state, components: [], contents: [] };
}
