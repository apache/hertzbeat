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
vi.mock('@/core/http/api-message', () => ({ apiMessageGet }));

import {
  loadPublicStatusComponents,
  loadPublicStatusIncidents,
  loadPublicStatusOrg
} from './public-status-api';
import { PublicStatusContractError } from './public-status-schema';

describe('public status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(apiMessageGet).toHaveBeenNthCalledWith(
      3,
      '/api/status/page/public/incident?pageIndex=0&pageSize=20'
    );
  });

  it('maps the backend component wrapper into the public view contract', async () => {
    apiMessageGet.mockResolvedValueOnce([{
      info: { id: 1, name: 'API', description: 'Public API', state: 0 },
      history: []
    }]);

    await expect(loadPublicStatusComponents()).resolves.toEqual([{
      id: 1,
      name: 'API',
      description: 'Public API',
      state: 0
    }]);
  });

  it('rejects malformed public status resources', async () => {
    apiMessageGet.mockResolvedValueOnce({ name: 'HertzBeat', description: 'Status', state: 0, token: 'secret' });

    await expect(loadPublicStatusOrg()).rejects.toBeInstanceOf(PublicStatusContractError);
  });
});
