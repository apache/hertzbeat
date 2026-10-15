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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTelemetrySources, TELEMETRY_SOURCES_PATH } from './explore-source-api';
const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: http.get }));
afterEach(() => vi.resetAllMocks());
describe('source availability contract', () => {
  it('reads availability using the existing authenticated HTTP boundary and cancellation', async () => {
    const payload = {
      external: { enabled: true, ready: true, accessible: true },
      self: {
        enabled: false,
        ready: false,
        accessible: false,
        workspaceId: '',
        reason: 'not configured',
        metricsStatus: 'NOT_READY'
      }
    };
    http.get.mockResolvedValue(payload);
    const signal = new AbortController().signal;
    expect(await loadTelemetrySources(signal)).toEqual(payload);
    expect(http.get).toHaveBeenCalledWith(TELEMETRY_SOURCES_PATH, { signal });
  });
  it('rejects incomplete or fabricated readiness payloads', async () => {
    http.get.mockResolvedValue({ self: { ready: true } });
    await expect(loadTelemetrySources()).rejects.toThrow();
  });
});
