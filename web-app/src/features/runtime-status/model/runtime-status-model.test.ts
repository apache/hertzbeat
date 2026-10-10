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

import type { RuntimeStatusRequestFailure, RuntimeStatusSnapshot } from './runtime-status-contract';
import { runtimeStatusViewModel } from './runtime-status-model';

describe('runtime status model', () => {
  it('publishes only resolved authoritative evidence', () => {
    const snapshot = runtimeStatusFixture();
    expect(runtimeStatusViewModel({ pending: true, snapshot, failure: null })).toEqual({
      state: 'loading',
      snapshot: null
    });
    expect(runtimeStatusViewModel({ pending: false, snapshot, failure: null })).toEqual({
      state: 'ready',
      snapshot
    });
  });

  it('drops cached evidence on request failure without inventing section status', () => {
    expect(runtimeStatusViewModel({ pending: false, snapshot: runtimeStatusFixture(), failure: 'permission' })).toEqual(
      {
        state: 'request-failed',
        snapshot: null,
        failure: 'permission'
      }
    );
  });

  it('keeps section error evidence distinct in the domain model', () => {
    expectTypeOf<RuntimeStatusRequestFailure>().toEqualTypeOf<'permission' | 'unavailable' | 'contract' | 'error'>();
    expectTypeOf<RuntimeStatusSnapshot['server']['errorCode']>().toEqualTypeOf<'server_unavailable' | null>();
    expectTypeOf<RuntimeStatusSnapshot['storage']['errorCode']>().toEqualTypeOf<
      'storage_unavailable' | 'storage_query_failed' | null
    >();
    expectTypeOf<RuntimeStatusSnapshot['collectors']['errorCode']>().toEqualTypeOf<
      'collector_status_unavailable' | null
    >();
  });
});

function runtimeStatusFixture(): RuntimeStatusSnapshot {
  return {
    observedAt: '2026-07-22T01:02:03Z',
    server: { status: 'available', errorCode: null },
    storage: { kind: 'greptime', status: 'available', errorCode: null },
    collectors: {
      status: 'available',
      total: 3,
      online: 3,
      runtimeHealthy: 1,
      lastReportedAt: '2026-07-22T01:02:00Z',
      errorCode: null
    }
  };
}
