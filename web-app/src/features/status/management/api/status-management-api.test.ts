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

const { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
}));

import { ApiMessageError } from '@/core/http/api-message';
import { StatusOrgNotFoundError } from '../../shared/status-error-model';

import {
  deleteStatusComponent,
  deleteStatusIncident,
  loadStatusComponent,
  loadStatusComponents,
  loadStatusIncident,
  loadStatusIncidents,
  loadStatusOrg,
  saveStatusComponent,
  saveStatusIncident,
  saveStatusOrg
} from './status-management-api';
import { StatusManagementContractError } from '../model/status-management-contract';

const org = {
  id: 1,
  name: 'HertzBeat',
  description: 'Status',
  home: '/',
  logo: '/logo.svg',
  state: 0
};
const component = {
  id: 3,
  orgId: 1,
  name: 'API',
  method: 0,
  configState: 0,
  state: 0
};
const incident = {
  id: 7,
  orgId: 1,
  name: 'Outage',
  state: 0,
  startTime: 100,
  components: [component],
  contents: [{ id: 8, incidentId: 7, message: 'Investigating', state: 0, timestamp: 100 }]
};

describe('status page management API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the established status page endpoints and verbs', async () => {
    apiMessageGet.mockImplementation((path: string) => {
      if (path === '/api/status/page/org') return Promise.resolve({ ...org, ignored: 'server-only' });
      if (path === '/api/status/page/component') return Promise.resolve([component]);
      if (path === '/api/status/page/component/3') return Promise.resolve(component);
      if (path === '/api/status/page/incident/7') return Promise.resolve(incident);
      return Promise.resolve({
        content: [incident],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8
      });
    });
    apiMessagePost.mockImplementation((path: string) =>
      Promise.resolve(path === '/api/status/page/org' ? { ...org, ignored: 'server-only' } : { leaked: true })
    );
    apiMessagePut.mockResolvedValue({ leaked: true });
    apiMessageDelete.mockResolvedValue({ leaked: true });

    await expect(loadStatusOrg()).resolves.toEqual(org);
    await expect(
      saveStatusOrg({
        name: 'HertzBeat',
        description: 'Status',
        home: '/',
        logo: '/logo.svg',
        state: 0
      })
    ).resolves.toEqual(org);
    await loadStatusComponents();
    await loadStatusComponent(3);
    await expect(
      saveStatusComponent(
        {
          orgId: 1,
          name: 'API',
          method: 0,
          configState: 0,
          state: 0
        },
        true
      )
    ).resolves.toBeUndefined();
    await expect(
      saveStatusComponent(
        {
          id: 3,
          orgId: 1,
          name: 'API',
          method: 1,
          configState: 1,
          state: 0
        },
        false
      )
    ).resolves.toBeUndefined();
    await expect(deleteStatusComponent(3)).resolves.toBeUndefined();
    await loadStatusIncidents({ search: '', pageIndex: 0, pageSize: 8 });
    await loadStatusIncident(7);
    await expect(
      saveStatusIncident(
        {
          orgId: 1,
          name: 'Outage',
          state: 0,
          components: [],
          contents: []
        },
        true
      )
    ).resolves.toBeUndefined();
    await expect(
      saveStatusIncident(
        {
          id: 7,
          orgId: 1,
          name: 'Outage',
          state: 3,
          components: [],
          contents: []
        },
        false
      )
    ).resolves.toBeUndefined();
    await expect(deleteStatusIncident(7)).resolves.toBeUndefined();

    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/org');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/status/page/org', expect.objectContaining({ name: 'HertzBeat' }));
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/component');
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/component/3');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/status/page/component', expect.objectContaining({ name: 'API' }));
    expect(apiMessagePut).toHaveBeenCalledWith('/api/status/page/component', expect.objectContaining({ id: 3 }));
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/status/page/component/3');
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/incident?pageIndex=0&pageSize=8');
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/incident/7');
    expect(apiMessagePost).toHaveBeenCalledWith(
      '/api/status/page/incident',
      expect.objectContaining({ name: 'Outage' })
    );
    expect(apiMessagePut).toHaveBeenCalledWith('/api/status/page/incident', expect.objectContaining({ id: 7 }));
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/status/page/incident/7');
  });

  it('rejects malformed GET data instead of returning an empty-looking result', async () => {
    apiMessageGet.mockResolvedValue({
      content: [],
      totalElements: 1,
      totalPages: 1,
      number: 1,
      size: 8
    });

    await expect(loadStatusIncidents({ search: '', pageIndex: 0, pageSize: 8 })).rejects.toBeInstanceOf(
      StatusManagementContractError
    );
  });

  it('normalizes organization-not-found transport evidence before leaving the API', async () => {
    apiMessageGet.mockRejectedValue(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 })
    );

    await expect(loadStatusOrg()).rejects.toBeInstanceOf(StatusOrgNotFoundError);
  });

  it('passes an abort signal to incident detail transport', async () => {
    apiMessageGet.mockResolvedValue(incident);
    const controller = new AbortController();

    await loadStatusIncident(7, controller.signal);

    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/incident/7', { signal: controller.signal });
  });

  it('encodes incident search through URLSearchParams', async () => {
    apiMessageGet.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 3,
      size: 20
    });

    await loadStatusIncidents({ search: 'api & web?', pageIndex: 3, pageSize: 20 });

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/api/status/page/incident?pageIndex=3&pageSize=20&search=api+%26+web%3F'
    );
  });
});
