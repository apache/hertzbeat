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
import { traceEvidenceFixture } from '@/test/trace-evidence-fixtures';
import { tracePageCsv } from './explore-trace-export';

describe('current-page trace CSV', () => {
  it('exports only supplied rows, quotes untrusted cells, and leaves unavailable root duration empty', () => {
    const csv = tracePageCsv([
      traceEvidenceFixture({ rootSpanName: '=SUM(1,2)"\n', durationNanos: 1_280_000_000 }),
      traceEvidenceFixture({
        traceId: 'missing-root',
        rootState: 'missing',
        rootSpanCount: 0,
        rootSpanId: null,
        rootSpanName: null,
        durationNanos: null
      })
    ]);
    expect(csv).toContain('"root_duration_ms"');
    expect(csv).toContain('"1280"');
    expect(csv).toContain('"\'=SUM(1,2)""\n"');
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(csv.split('\r\n')[2]).toContain('"missing",""');
    expect(csv.split('\r\n')[2]).toContain('"missing","","1","0"');
  });
});
