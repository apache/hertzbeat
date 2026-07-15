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

import { describe, expect, it, vi } from 'vitest';

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet }));

import { loadInstrumentationCollectors } from './instrumentation-collector-api';

describe('instrumentation Collector API', () => {
  it('loads registered Collectors and derives non-secret OTLP targets', async () => {
    apiMessageGet.mockResolvedValue({
      content: [
        { collector: { name: 'collector-east', ip: '10.0.0.8', status: 0 } },
        { collector: { name: 'collector-offline', ip: '10.0.0.9', status: 1 } }
      ]
    });

    await expect(loadInstrumentationCollectors()).resolves.toEqual([
      expect.objectContaining({
        collectorId: 'collector-east', online: true,
        otlpHttpEndpoint: 'http://10.0.0.8:4318', otlpGrpcEndpoint: 'http://10.0.0.8:4317'
      }),
      expect.objectContaining({ collectorId: 'collector-offline', online: false })
    ]);
    expect(apiMessageGet).toHaveBeenCalledWith('/api/collector?pageIndex=0&pageSize=200', undefined);
  });
});
