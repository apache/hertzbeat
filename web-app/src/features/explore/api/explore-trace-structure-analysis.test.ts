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
