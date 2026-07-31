/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BrowserEventStreamHandlers } from '@/core/http/event-stream';

const eventStream = vi.hoisted(() => ({
  handlers: undefined as BrowserEventStreamHandlers | undefined,
  openBrowserEventStream: vi.fn((_path: string, handlers: BrowserEventStreamHandlers) => {
    eventStream.handlers = handlers;
    return { close: vi.fn() };
  })
}));
vi.mock('@/core/http/event-stream', () => eventStream);

import { openMonitorImportTaskStream } from './monitor-import-task-stream';

describe('monitor import task stream', () => {
  beforeEach(() => vi.clearAllMocks());

  it('treats ready and task events only as validated canonical-reread triggers', () => {
    const onCanonicalReread = vi.fn();
    openMonitorImportTaskStream({ onCanonicalReread });

    expect(eventStream.openBrowserEventStream).toHaveBeenCalledWith(
      '/api/manager/sse/subscribe',
      expect.objectContaining({ eventNames: ['manager-ready', 'IMPORT_TASK_EVENT'] })
    );
    const handlers = eventStream.handlers;
    const payload = '{"schemaVersion":1,"delivery":"CANONICAL_REREAD"}';
    handlers?.onEvent('manager-ready', payload);
    handlers?.onEvent('IMPORT_TASK_EVENT', payload);
    handlers?.onEvent('IMPORT_TASK_EVENT', '{"status":"COMPLETED"}');

    expect(onCanonicalReread).toHaveBeenCalledTimes(2);
    expect(onCanonicalReread).toHaveBeenNthCalledWith(1, 'manager-ready');
    expect(onCanonicalReread).toHaveBeenNthCalledWith(2, 'IMPORT_TASK_EVENT');
  });
});
