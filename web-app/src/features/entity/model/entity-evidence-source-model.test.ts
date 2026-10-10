/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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

import { entityEvidenceSourceState } from './entity-evidence-source-model';

describe('entity evidence source model', () => {
  it('orders monitor before an OTLP-first input without synthesizing another source', () => {
    expect(
      entityEvidenceSourceState({
        activeSignalCount: 1,
        activeSignals: ['metrics'],
        active: { metrics: true, logs: false, traces: false },
        totals: { metrics: 3, logs: 0, traces: 0 },
        sources: [
          { source: 'otlp', metrics: 2, logs: 0, traces: 0 },
          { source: 'monitor', metrics: 1, logs: 0, traces: 0 }
        ]
      })
    ).toEqual({
      kind: 'ready',
      rows: [
        { source: 'monitor', metrics: 1, logs: 0, traces: 0 },
        { source: 'otlp', metrics: 2, logs: 0, traces: 0 }
      ]
    });
  });

  it('distinguishes unavailable provenance from an explicit empty source result', () => {
    expect(entityEvidenceSourceState(undefined)).toEqual({ kind: 'unavailable' });
    expect(
      entityEvidenceSourceState({
        activeSignalCount: 0,
        activeSignals: [],
        active: { metrics: false, logs: false, traces: false },
        totals: { metrics: 0, logs: 0, traces: 0 },
        sources: []
      })
    ).toEqual({ kind: 'empty' });
  });
});
