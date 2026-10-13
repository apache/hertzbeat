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
import { traceEvidenceSchema } from './index';
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';

describe('observed trace evidence contract', () => {
  it('rejects safe integers outside the representable Date range', () => {
    const row = traceEvidenceFixture();
    const start = 8_640_000_000_000_001;
    expect(
      traceEvidenceSchema.safeParse({
        ...row,
        startTime: start,
        observedStartTime: start,
        observedEndTime: start + 1,
        representativeSpan: { ...row.representativeSpan, startTime: start }
      }).success
    ).toBe(false);
  });
  it('accepts missing roots and unattributed spans without inventing a root or service identity', () => {
    const row = traceEvidenceFixture({
      rootState: 'missing',
      rootSpanCount: 0,
      rootSpanId: null,
      rootSpanName: null,
      serviceName: null,
      serviceNamespace: null,
      resourceAttributes: null,
      durationNanos: null,
      startTime: null,
      serviceStats: {},
      unattributedServiceStats: { spanCount: 1, errorCount: 0 }
    });
    expect(traceEvidenceSchema.parse(row)).toEqual(row);
  });

  it.each([
    { rootState: 'missing' },
    { rootSpanCount: 2 },
    { durationNanos: null },
    { observedEndTime: 0 },
    { rootSpanCount: 99 },
    { serviceStats: {} },
    { unattributedServiceStats: { spanCount: 1, errorCount: 0 } }
  ])('rejects conflicting structural or count evidence', override => {
    expect(traceEvidenceSchema.safeParse({ ...traceEvidenceFixture(), ...override }).success).toBe(false);
  });
});
