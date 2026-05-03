import { describe, expect, it } from 'vitest';
import { buildSpanFocusQuery, buildTraceFocusQuery } from './stream-focus';

describe('log stream focus query helpers', () => {
  const baseQuery = {
    search: '',
    logContent: 'timeout',
    traceId: '',
    spanId: '',
    severityNumber: '',
    severityText: 'ERROR'
  };

  it('builds a trace-focused query from the selected log', () => {
    expect(
      buildTraceFocusQuery(baseQuery, {
        traceId: 'trace-1',
        spanId: 'span-1'
      } as any)
    ).toEqual({
      ...baseQuery,
      traceId: 'trace-1',
      spanId: ''
    });
  });

  it('builds a span-focused query and carries trace id when available', () => {
    expect(
      buildSpanFocusQuery(baseQuery, {
        traceId: 'trace-1',
        spanId: 'span-1'
      } as any)
    ).toEqual({
      ...baseQuery,
      traceId: 'trace-1',
      spanId: 'span-1'
    });
  });

  it('keeps the original query when required ids are missing', () => {
    expect(buildTraceFocusQuery(baseQuery, null)).toBe(baseQuery);
    expect(buildSpanFocusQuery(baseQuery, { traceId: 'trace-1' } as any)).toBe(baseQuery);
  });
});
