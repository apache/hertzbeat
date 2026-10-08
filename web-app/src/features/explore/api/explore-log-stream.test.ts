/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { afterEach, expect, it, vi } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
const api = vi.hoisted(() => ({
  get: vi.fn(),
  open: vi.fn<(path: string, handlers: unknown) => { close: () => void }>(() => ({ close: vi.fn() }))
}));
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: api.get
}));
vi.mock('@/core/http/event-stream', () => ({ openBrowserEventStream: api.open }));
import { buildLogStreamPath } from './explore-api';
import { openLogStream } from './explore-log-stream';
afterEach(() => {
  vi.resetAllMocks();
});
const handlers = () => ({
  onOpen: vi.fn(),
  onLog: vi.fn(),
  onGap: vi.fn(),
  onRetrying: vi.fn(),
  onUnavailable: vi.fn(),
  onContractError: vi.fn(),
  onInvalidFilter: vi.fn(),
  onPermission: vi.fn()
});
it('validates the same parameters before exactly one stream opens', async () => {
  api.get.mockResolvedValue(null);
  const stream = openLogStream('/api/logs/sse/subscribe?resourceFilter=region%3Aeast', handlers());
  expect(api.open).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce());
  expect(api.get).toHaveBeenCalledWith('/api/logs/sse/validate?resourceFilter=region%3Aeast', {
    signal: expect.any(AbortSignal),
    preserveErrorEnvelope: true
  });
  stream.close();
});
it.each([
  ['invalid_filter', 400, 'observability_log_filter_invalid', 'onInvalidFilter'],
  ['permission', 403, 'forbidden', 'onPermission'],
  ['transport', 503, 'unavailable', 'onUnavailable']
] as const)('makes %s a terminal preflight outcome without reconnect', async (_kind, status, message, callback) => {
  api.get.mockRejectedValue(new ApiMessageError(message, { status }));
  const callbacks = handlers();
  openLogStream('/api/logs/sse/subscribe', callbacks);
  await vi.waitFor(() => expect(callbacks[callback]).toHaveBeenCalledOnce());
  expect(api.open).not.toHaveBeenCalled();
  expect(callbacks.onRetrying).not.toHaveBeenCalled();
});
it('aborts retired validation and ignores its late completion while replacement connects', async () => {
  let finish: (value: unknown) => void = () => undefined;
  api.get
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    )
    .mockResolvedValueOnce(null);
  const first = openLogStream('/api/logs/sse/subscribe?query=old', handlers());
  const signal = api.get.mock.calls[0]?.[1].signal as AbortSignal;
  first.close();
  expect(signal.aborted).toBe(true);
  openLogStream('/api/logs/sse/subscribe?query=new', handlers());
  finish(null);
  await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce());
  expect(api.open.mock.calls[0]?.[0]).toBe('/api/logs/sse/subscribe?query=new');
});

it.each([
  '@literal.key[]:4',
  'resource.allowed_codes[]:[2 TO 6]',
  '@permissions[]:(4 6)',
  '@names[]:"Peter"',
  '@codes[]:"4"',
  '@names[]:""',
  'resource.names[]:"Peter"',
  String.raw`@names[]:"a\"b\\c's*?"`,
  '@names[]:"caf\u00e9"',
  '@names[]:"Peter Parker"',
  '@codes[]:(4 "4") AND NOT @names[]:""',
  '@users[]["codes"][]:[2 TO 6]',
  '@users[]["name"][]:"Peter"',
  'resource.users[]["name"][]:""',
  '@users.name[]["codes.v"][]:"4"',
  '@users[ ]["codes"] [ ] : (4 "4")',
  '@users[]["name"][]:"Peter" AND NOT @users[]["role"][]:"guest"'
])('validates and subscribes with the identical opaque collection expression: %s', async query => {
  api.get.mockResolvedValue(null);
  const path = buildLogStreamPath({ signal: 'logs', timeRange: 'last-30m', searchSyntax: 'structured-v1', query });
  const stream = openLogStream(path, handlers());
  await vi.waitFor(() => expect(api.open).toHaveBeenCalledOnce());
  expect(api.get).toHaveBeenCalledWith(`/api/logs/sse/validate${path.slice(path.indexOf('?'))}`, expect.any(Object));
  expect(api.open.mock.calls[0]![0]).toBe(path);
  expect(new URL(path, 'http://local').searchParams.get('logContent')).toBe(query);
  stream.close();
});
it('reports validated structured diagnostics from Live preflight without admitting a stream', async () => {
  api.get.mockRejectedValue(
    new ApiMessageError('observability_log_filter_invalid', {
      status: 400,
      data: { syntaxIssue: 'missing_value', start: 8, end: 8 }
    })
  );
  const callbacks = handlers();
  openLogStream('/api/logs/sse/subscribe?searchSyntax=structured-v1&logContent=service%3A', callbacks);
  await vi.waitFor(() =>
    expect(callbacks.onInvalidFilter).toHaveBeenCalledWith(undefined, {
      issue: 'missing_value',
      start: 8,
      end: 8,
      expression: 'service:'
    })
  );
  expect(api.open).not.toHaveBeenCalled();
});
