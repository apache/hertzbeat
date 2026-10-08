import { describe, expect, it } from 'vitest';
import { traceFlowLayout } from './explore-trace-flow-layout';
import type { TraceStructureAnalysis } from './explore-trace-structure-analysis';

const edge = (sourceService: string, targetService: string): TraceStructureAnalysis['edges'][number] => ({
  sourceService,
  targetService,
  spanCount: 1,
  traceCount: 1,
  exampleTraceId: 'dd55aa0011223344556677889900bbcc',
  exampleParentSpanId: '1111111111111111',
  exampleChildSpanId: '2222222222222222'
});

describe('observed request flow layout', () => {
  it('places observed parents before children even when the API orders edges by count', () => {
    const result = traceFlowLayout([edge('cart', 'payment'), edge('checkout', 'cart')]);
    expect(result.services).toEqual(['checkout', 'cart', 'payment']);
    expect(result.edges).toHaveLength(2);
    expect(result.limited).toBe(false);
  });

  it('reports visual truncation while preserving the full edge table separately', () => {
    const edges = Array.from({ length: 21 }, (_, index) => edge(`service-${index}`, `service-${index + 1}`));
    const result = traceFlowLayout(edges);
    expect(result.limited).toBe(true);
    expect(result.services.length).toBeLessThanOrEqual(12);
    expect(result.edges.length).toBeLessThan(edges.length);
  });
});
