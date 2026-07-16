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

describe('public status API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMessageGet.mockResolvedValue(undefined);
  });

  it('uses the established public status queries', async () => {
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
});
