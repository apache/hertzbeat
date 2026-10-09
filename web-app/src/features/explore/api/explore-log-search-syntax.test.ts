/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { loadLogHistoryEvidence } from './explore-api';
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: vi.fn()
}));
it('uses identical syntax and body across history list, overview and trend requests', async () => {
  const request = vi.mocked(apiMessageGet);
  request
    .mockResolvedValueOnce({ content: [], totalElements: 0, pageIndex: 0, pageSize: 20 })
    .mockRejectedValue(new Error('unavailable'));
  await loadLogHistoryEvidence({
    signal: 'logs',
    timeRange: 'last-30m',
    searchSyntax: 'structured-v1',
    query: 'status:error OR status:warn'
  });
  expect(request).toHaveBeenCalledTimes(3);
  for (const [path] of request.mock.calls) {
    const params = new URL(path, 'http://local').searchParams;
    expect(params.get('searchSyntax')).toBe('structured-v1');
    expect(params.get('search')).toBe('status:error OR status:warn');
  }
});
