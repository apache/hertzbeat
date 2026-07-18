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

import { describe, expect, it } from 'vitest';

import type {
  OptionalRemoteValueState,
  RemoteCollectionState,
  RemotePageState
} from './remote-state-model';

describe('remote state model', () => {
  it('narrows successful value data without an assertion', () => {
    const state: OptionalRemoteValueState<{ name: string }, 'unavailable'> = {
      kind: 'ready',
      data: { name: 'HertzBeat' }
    };

    expect(readName(state)).toBe('HertzBeat');
  });

  it('keeps collection and page payloads on ready states only', () => {
    const collection: RemoteCollectionState<number> = { kind: 'ready', records: [1, 2] };
    const page: RemotePageState<number> = { kind: 'ready', records: [1, 2], total: 2 };

    expect(collection.records).toEqual([1, 2]);
    expect(page.total).toBe(2);
    expect(readPageTotal({ kind: 'unavailable' })).toBeNull();
  });

  it('rejects impossible success and failure shapes during typecheck', () => {
    // @ts-expect-error A ready value must carry its data.
    const missingData: OptionalRemoteValueState<string> = { kind: 'ready' };
    // @ts-expect-error A failure cannot carry successful data.
    const failedWithData: OptionalRemoteValueState<string> = { kind: 'error', data: 'stale' };
    // @ts-expect-error A ready page must carry its total.
    const missingTotal: RemotePageState<string> = { kind: 'ready', records: [] };

    expect([missingData, failedWithData, missingTotal]).toHaveLength(3);
  });
});

function readName(state: OptionalRemoteValueState<{ name: string }, 'unavailable'>) {
  return state.kind === 'ready' ? state.data.name : null;
}

function readPageTotal(state: RemotePageState<number>) {
  if (state.kind === 'loading' || state.kind === 'empty') return null;
  if (state.kind === 'missing' || state.kind === 'invalid') return null;
  if (state.kind === 'unavailable' || state.kind === 'error') return null;
  return state.total;
}
