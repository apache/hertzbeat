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
  beforeEach(() => {
    apiMessageGet.mockReset();
  });

  it('uses the established public status queries', async () => {
    apiMessageGet
      .mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 0 })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    await loadPublicStatusOrg();
    await loadPublicStatusComponents();
    await loadPublicStatusIncidents();

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/status/page/public/org');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/api/status/page/public/component');
    expect(apiMessageGet).toHaveBeenNthCalledWith(3, '/api/status/page/public/incident?pageIndex=0&pageSize=20');
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
        state: 'healthy'
      }
    ]);
  });

  it('maps every backend state domain into stable public status values', async () => {
    apiMessageGet
      .mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 0 })
      .mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 1 })
      .mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 2 })
      .mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 9 })
      .mockResolvedValueOnce([
        { info: { id: 1, name: 'Healthy', state: 0 } },
        { info: { id: 2, name: 'Incident', state: 1 } },
        { info: { id: 3, name: 'Unknown', state: 2 } },
        { info: { id: 4, name: 'Future', state: 9 } }
      ])
      .mockResolvedValueOnce({
        content: [
          { id: 1, name: 'Investigating', state: 0 },
          { id: 2, name: 'Identified', state: 1 },
          { id: 3, name: 'Monitoring', state: 2 },
          { id: 4, name: 'Resolved', state: 3 },
          { id: 5, name: 'Future', state: 9 }
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
      { id: 1, name: 'Healthy', state: 'healthy' },
      { id: 2, name: 'Incident', state: 'incident' },
      { id: 3, name: 'Unknown', state: 'unknown' },
      { id: 4, name: 'Future', state: 'unknown' }
    ]);
    await expect(loadPublicStatusIncidents()).resolves.toMatchObject({
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

    const result = await loadPublicStatusIncidents();

    expect(result.content.map(incident => incident.id)).toEqual(Array.from({ length: 21 }, (_, index) => index + 1));
    expect(result.totalElements).toBe(21);
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/api/status/page/public/incident?pageIndex=1&pageSize=20');
  });

  it('rejects a single first page whose positive size differs from the requested size', async () => {
    apiMessageGet.mockResolvedValueOnce({
      ...incidentPage(0, 1, 1, [1]),
      size: publicStatusIncidentPageSize + 1
    });

    await expect(loadPublicStatusIncidents()).rejects.toBeInstanceOf(PublicStatusContractError);
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

    await expect(loadPublicStatusIncidents()).rejects.toBeInstanceOf(PublicStatusContractError);
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

    await expect(loadPublicStatusIncidents()).rejects.toBeInstanceOf(PublicStatusContractError);
    expect(apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed public status resources', async () => {
    apiMessageGet.mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 0, token: 'secret' });

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
    content: ids.map(id => ({ id, name: `Incident ${id}`, state: 1 })),
    totalElements,
    totalPages,
    number,
    size: publicStatusIncidentPageSize
  };
}
