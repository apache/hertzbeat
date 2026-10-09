/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { buildTraceLogsPath, validatedTraceReturn } from './explore-trace-log-return';
import { buildExplorePath, parseExploreQuery } from './explore-model';
import { savedQueryConditions } from './explore-saved-query-model';
const list = {
  signal: 'traces' as const,
  timeRange: 'last-30m' as const,
  query: 'GET',
  attributeFilter: 'http.status_code = 500',
  pageIndex: 3,
  sort: 'duration_desc' as const,
  spanScope: 'entrypoint' as const,
  serviceName: 'checkout',
  environment: 'prod',
  start: 1000,
  end: 2000,
  timeZone: 'UTC'
};
const focused = { ...list, traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), returnTo: buildExplorePath(list) };
function parse(path: string) {
  return parseExploreQuery(new URL(path, 'http://local').searchParams);
}
it('pivots to exact correlated logs without span predicates and returns through trace to original list', () => {
  const result = parse(buildTraceLogsPath(focused, focused.traceId, 'c'.repeat(16)));
  if (result.signal !== 'logs') throw new Error('wrong fixture');
  expect(result).toMatchObject({
    signal: 'logs',
    traceId: focused.traceId,
    spanId: 'c'.repeat(16),
    start: 1000,
    end: 2000,
    timeZone: 'UTC',
    serviceName: 'checkout',
    environment: 'prod'
  });
  expect(result.attributeFilter).toBeUndefined();
  expect(result.resourceFilter).toBeUndefined();
  const target = validatedTraceReturn(result);
  expect(target).toBeDefined();
  expect(parse(target!)).toMatchObject({ ...focused, spanId: 'c'.repeat(16) });
  expect(parse(parse(target!).returnTo!)).toMatchObject(list);
  expect(savedQueryConditions(result)).not.toHaveProperty('traceReturnTo');
});
it('rejects unrelated or unsafe targets while keeping valid log query usable', () => {
  const result = parse(buildTraceLogsPath(focused, focused.traceId, focused.spanId));
  if (result.signal !== 'logs') throw new Error('wrong fixture');
  for (const patch of [
    { traceId: 'd'.repeat(32) },
    { spanId: 'e'.repeat(16) },
    { end: 2001 },
    { timeZone: 'Asia/Shanghai' }
  ])
    expect(validatedTraceReturn({ ...result, ...patch })).toBeUndefined();
  for (const traceReturnTo of [
    'https://invalid.test',
    '/explore?signal=traces&traceId=' + focused.traceId,
    buildExplorePath(focused) + '&traceId=' + focused.traceId,
    buildExplorePath(focused) + '&traceReturnTo=bad'
  ])
    expect(validatedTraceReturn({ ...result, traceReturnTo })).toBeUndefined();
});

it('opens all trace logs while retaining the selected span only in the return context', () => {
  const result = parse(buildTraceLogsPath(focused, focused.traceId, undefined));
  if (result.signal !== 'logs') throw new Error('wrong fixture');
  expect(result.traceId).toBe(focused.traceId);
  expect(result.spanId).toBeUndefined();
  expect(result.start).toBe(focused.start);
  expect(result.end).toBe(focused.end);
  expect(validatedTraceReturn(result)).toBe(buildExplorePath(focused));
});
it('keeps the trace return after broadening a span log query to the whole trace', () => {
  const result = parse(buildTraceLogsPath(focused, focused.traceId, focused.spanId));
  if (result.signal !== 'logs') throw new Error('wrong fixture');
  expect(validatedTraceReturn({ ...result, spanId: undefined })).toBe(buildExplorePath(focused));
});
