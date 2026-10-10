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
import { parseTraceStructureAnalysis } from './explore-trace-structure-analysis';

describe('trace structure analysis wire contract', () => {
  const complete = {
    rowLimit: 1500,
    scannedRows: 3,
    truncated: false,
    matchedTraces: 1,
    patterns: [
      {
        shape: [
          {
            serviceName: 'checkout',
            operationName: 'POST /checkout',
            status: 'ok',
            parentServiceName: null,
            parentOperationName: null,
            missingParent: false
          }
        ],
        traceCount: 1,
        traceIds: ['dd55aa0011223344556677889900bbcc'],
        traceIdsTruncated: false
      }
    ],
    patternsTruncated: false,
    edges: [
      {
        sourceService: 'checkout',
        targetService: 'cart',
        spanCount: 1,
        traceCount: 1,
        exampleTraceId: 'dd55aa0011223344556677889900bbcc',
        exampleParentSpanId: '1111111111111111',
        exampleChildSpanId: '2222222222222222'
      }
    ],
    edgesTruncated: false
  };

  it('accepts bounded source-backed patterns and edges', () => {
    expect(parseTraceStructureAnalysis(complete).edges[0]?.targetService).toBe('cart');
  });

  it('rejects missing coverage and impossible scan sizes instead of showing a complete map', () => {
    expect(() => parseTraceStructureAnalysis({ ...complete, scannedRows: 1501 })).toThrow();
    expect(() => parseTraceStructureAnalysis({ ...complete, truncated: undefined })).toThrow();
    expect(() =>
      parseTraceStructureAnalysis({ ...complete, edges: [{ ...complete.edges[0], spanCount: 0 }] })
    ).toThrow();
    expect(() => parseTraceStructureAnalysis({ ...complete, matchedTraces: 2 })).toThrow();
  });
});
