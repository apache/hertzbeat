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
import detailSource from './trace-detail.tsx?raw';
import source from './trace-result.tsx?raw';
import tableSource from './trace-table.tsx?raw';

describe('Trace result architecture', () => {
  it('keeps queries, transport, routing, and controllers out of presentation', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|useQuery|loadTraceDetail|\.\.\/api\/|\.\.\/controller\/|react-router/);
  });

  it('keeps result orchestration separate from table and detail presentation', () => {
    expect(source).toContain("from './trace-table'");
    expect(source).toContain("from './trace-detail'");
    expect(source).not.toMatch(/\bTable\b|\bDescriptions\b|OtlpAttributeSection|traceHealthState/);

    expect(tableSource).toMatch(/<Table<TraceRow>/);
    expect(tableSource).toContain('interactiveTableRow');
    expect(tableSource).not.toMatch(/<aside|<Descriptions|OtlpAttributeSection/);

    expect(detailSource).toMatch(/<aside|<Descriptions|OtlpAttributeSection/);
    expect(detailSource).not.toMatch(/<Table<TraceRow>|interactiveTableRow/);
  });
});
