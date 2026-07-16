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
vi.mock('@/core/http/api-message', () => ({
  apiMessageDelete,
  apiMessageGet,
  apiMessagePost,
  apiMessagePut
}));

import {
  deleteStatusComponent,
  deleteStatusIncident,
  loadStatusComponents,
  loadStatusIncident,
  loadStatusIncidents,
  loadStatusOrg,
  saveStatusComponent,
  saveStatusIncident,
  saveStatusOrg
} from './status-management-api';

describe('status page management API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the established status page endpoints and verbs', async () => {
    apiMessageGet.mockResolvedValue(undefined);
    apiMessagePost.mockResolvedValue(undefined);
    apiMessagePut.mockResolvedValue(undefined);
    apiMessageDelete.mockResolvedValue(undefined);

    await loadStatusOrg();
    await saveStatusOrg({ name: 'HertzBeat', description: 'Status', home: '/', logo: '/logo.svg', state: 0 });
    await loadStatusComponents();
    await saveStatusComponent({ orgId: 1, name: 'API', method: 0, configState: 0, state: 0 }, true);
    await saveStatusComponent({ id: 3, orgId: 1, name: 'API', method: 1, configState: 1, state: 0 }, false);
    await deleteStatusComponent(3);
    await loadStatusIncidents({ search: '', pageIndex: 0, pageSize: 8 });
    await loadStatusIncident(7);
    await saveStatusIncident({ orgId: 1, name: 'Outage', state: 0, components: [], contents: [] }, true);
    await saveStatusIncident({ id: 7, orgId: 1, name: 'Outage', state: 3, components: [], contents: [] }, false);
    await deleteStatusIncident(7);

    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/org');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/status/page/org', expect.objectContaining({ name: 'HertzBeat' }));
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/component');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/status/page/component', expect.objectContaining({ name: 'API' }));
    expect(apiMessagePut).toHaveBeenCalledWith('/api/status/page/component', expect.objectContaining({ id: 3 }));
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/status/page/component/3');
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/incident?pageIndex=0&pageSize=8');
    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/incident/7');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/status/page/incident', expect.objectContaining({ name: 'Outage' }));
    expect(apiMessagePut).toHaveBeenCalledWith('/api/status/page/incident', expect.objectContaining({ id: 7 }));
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/status/page/incident/7');
  });

  it('passes an abort signal to incident detail transport', async () => {
    apiMessageGet.mockResolvedValue(undefined);
    const controller = new AbortController();

    await loadStatusIncident(7, controller.signal);

    expect(apiMessageGet).toHaveBeenCalledWith('/api/status/page/incident/7', { signal: controller.signal });
  });

  it('encodes incident search through URLSearchParams', async () => {
    apiMessageGet.mockResolvedValue(undefined);

    await loadStatusIncidents({ search: 'api & web?', pageIndex: 3, pageSize: 20 });

    expect(apiMessageGet).toHaveBeenCalledWith(
      '/api/status/page/incident?pageIndex=3&pageSize=20&search=api+%26+web%3F'
    );
  });
});
