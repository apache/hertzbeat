/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { hertzBeatQuerySchema } from './hertzbeat-query-contract';
import { queryHertzBeatData } from './hertzbeat-query-client';
vi.mock('@/core/http/api-message', async original => ({ ...(await original<object>()), apiMessageGet: vi.fn() }));
const logSort = { version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' };
const query = { signal: 'logs', queryKind: 'table', timeWindow: { from: 1000, to: 2000 }, logSort };
it('preserves a typed sort through the controlled dashboard query API', async () => {
  const parsed = hertzBeatQuerySchema.parse(query);
  vi.mocked(apiMessageGet).mockResolvedValue({ content: [], totalElements: 0, size: 20, number: 0 });
  if (parsed.signal !== 'logs' || parsed.queryKind !== 'table') throw new Error('Expected log query');
  await queryHertzBeatData(parsed);
  const path = String(vi.mocked(apiMessageGet).mock.calls.at(-1)?.[0]);
  expect(JSON.parse(new URL(path, 'http://localhost').searchParams.get('logSort')!)).toEqual(logSort);
});
it('rejects conflicting or invalid saved dashboard order', () => {
  expect(hertzBeatQuerySchema.safeParse({ ...query, sort: 'oldest' }).success).toBe(false);
  expect(
    hertzBeatQuerySchema.safeParse({ ...query, logSort: { ...logSort, field: 'builtin:serviceName' } }).success
  ).toBe(false);
});
