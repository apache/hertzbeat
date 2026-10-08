/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import type { BrowserEventStreamHandlers } from '@/core/http/event-stream';
import { useLiveLogController } from './use-live-log-controller';
const transport = vi.hoisted(() => ({
  validate: vi.fn(),
  open: vi.fn<(path: string, handlers: BrowserEventStreamHandlers) => { close: () => void }>()
}));
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: transport.validate
}));
vi.mock('@/core/http/event-stream', () => ({ openBrowserEventStream: transport.open }));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({
    session: { authenticated: true, username: 'operator', roles: ['ADMIN'], workspaceId: 'default' }
  })
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const selector = (numeric = '2.0') =>
  JSON.stringify({
    version: 1,
    groups: [
      { field: 'attribute:number', kind: 'value', value: numeric },
      { field: 'attribute:empty', kind: 'value', value: '' },
      { field: 'resource:missing', kind: 'missing', value: null },
      { field: 'attribute:null', kind: 'null', value: null }
    ]
  });
const query = (selection = selector()) => ({
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  live: true,
  serviceName: 'checkout',
  query: 'a OR b',
  searchSyntax: 'structured-v1',
  logGroupSelection: selection,
  start: 1000,
  end: 3000
});
it('revalidates the identical four-key selection after retryable 503 before opening a stream', async () => {
  transport.validate
    .mockRejectedValueOnce(new ApiMessageError('unavailable', { status: 503 }))
    .mockResolvedValueOnce(null);
  transport.open.mockReturnValue({ close: vi.fn() });
  const view = renderHook(() => useLiveLogController(query()));
  await waitFor(() => expect(view.result.current.status).toBe('unavailable'));
  expect(transport.open).not.toHaveBeenCalled();
  act(() => view.result.current.retry());
  await waitFor(() => expect(transport.open).toHaveBeenCalledOnce());
  expect(transport.validate).toHaveBeenCalledTimes(2);
  const validationPath = transport.validate.mock.calls[0]![0] as string;
  expect(transport.validate.mock.calls[1]![0]).toBe(validationPath);
  const subscriptionPath = transport.open.mock.calls[0]![0];
  expect(validationPath.split('?')[1]).toBe(subscriptionPath.split('?')[1]);
  const params = new URLSearchParams(subscriptionPath.split('?')[1]);
  expect(params.get('logGroupSelection')).toBe(selector());
  expect(params.get('serviceName')).toBe('checkout');
  expect(params.get('logContent')).toBe('a OR b');
  expect(params.has('start')).toBe(false);
  expect(params.has('end')).toBe(false);
  expect(view.result.current.rows).toEqual([]);
  expect(view.result.current.status).toBe('waiting');
});
it('aborts old selector preflight then closes a replaced stream and retires its buffer', async () => {
  let finish!: () => void;
  transport.validate
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = () => resolve(null);
        })
    )
    .mockResolvedValue(null);
  const close = vi.fn();
  transport.open.mockReturnValue({ close });
  const view = renderHook(({ selection }) => useLiveLogController(query(selection)), {
    initialProps: { selection: selector('2.0') }
  });
  const signal = (transport.validate.mock.calls[0]![1] as { signal: AbortSignal }).signal;
  view.rerender({ selection: selector('2') });
  expect(signal.aborted).toBe(true);
  finish();
  await waitFor(() => expect(transport.open).toHaveBeenCalledOnce());
  const old = transport.open.mock.calls[0]![1];
  act(() => old.onEvent('LOG_EVENT', JSON.stringify(row('selected-two'))));
  await waitFor(() => expect(view.result.current.rows.map(log => log.body)).toEqual(['selected-two']));
  view.rerender({ selection: selector('2e0') });
  expect(close).toHaveBeenCalledOnce();
  expect(view.result.current.rows).toEqual([]);
  act(() => old.onEvent('LOG_EVENT', JSON.stringify(row('stale'))));
  expect(view.result.current.rows).toEqual([]);
  await waitFor(() => expect(transport.open).toHaveBeenCalledTimes(2));
  expect(new URLSearchParams(transport.open.mock.calls[1]![0].split('?')[1]).get('logGroupSelection')).toBe(
    selector('2e0')
  );
});
function row(body: string) {
  return {
    body,
    timeUnixNano: 1000000000,
    observedTimeUnixNano: null,
    severityNumber: 9,
    severityText: 'INFO',
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null
  };
}
