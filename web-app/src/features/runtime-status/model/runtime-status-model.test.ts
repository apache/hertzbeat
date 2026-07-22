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

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { RuntimeStatusSnapshot } from './runtime-status-contract';
import { unavailableRuntimeStatus } from './runtime-status-model';

describe('runtime status model', () => {
  it('fails closed without inventing an observation or healthy Collector counts', () => {
    expect(unavailableRuntimeStatus()).toEqual({
      observedAt: null,
      server: { status: 'unavailable', errorCode: 'server_unavailable' },
      storage: { kind: 'greptime', status: 'unavailable', errorCode: 'storage_unavailable' },
      collectors: {
        status: 'unavailable',
        total: null,
        online: null,
        runtimeHealthy: null,
        lastReportedAt: null,
        errorCode: 'collector_status_unavailable'
      }
    });
  });

  it('keeps section error evidence distinct in the domain model', () => {
    expectTypeOf<RuntimeStatusSnapshot['server']['errorCode']>().toEqualTypeOf<'server_unavailable' | null>();
    expectTypeOf<RuntimeStatusSnapshot['storage']['errorCode']>().toEqualTypeOf<
      'storage_unavailable' | 'storage_query_failed' | null
    >();
    expectTypeOf<RuntimeStatusSnapshot['collectors']['errorCode']>().toEqualTypeOf<
      'collector_status_unavailable' | null
    >();
  });
});
