/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const eventStream = vi.hoisted(() => ({
  openBrowserEventStream: vi.fn<
    (
      path: string,
      handlers: {
        eventNames: readonly string[];
        onEvent: (name: string, payload: string) => void;
      }
    ) => { close: () => void }
  >(() => ({ close: vi.fn() }))
}));
vi.mock('@/core/http/event-stream', () => eventStream);

import { openMonitorImportTaskStream } from './monitor-import-task-stream';

describe('monitor import task stream', () => {
  beforeEach(() => vi.clearAllMocks());

  it('owns the manager endpoint and forwards only validated import task events', () => {
    const onTask = vi.fn();
    openMonitorImportTaskStream({ onTask });

    expect(eventStream.openBrowserEventStream).toHaveBeenCalledWith(
      '/api/manager/sse/subscribe',
      expect.objectContaining({ eventNames: ['IMPORT_TASK_EVENT'] })
    );
    const handlers = eventStream.openBrowserEventStream.mock.calls[0]?.[1];
    handlers?.onEvent(
      'IMPORT_TASK_EVENT',
      JSON.stringify({
        notifyLevel: 'SUCCESS',
        managerEventType: 'IMPORT_TASK_EVENT',
        taskName: 'monitors.json',
        status: 'COMPLETED'
      })
    );
    handlers?.onEvent('IMPORT_TASK_EVENT', '{"notifyLevel":"SUCCESS"}');

    expect(onTask).toHaveBeenCalledOnce();
    expect(onTask).toHaveBeenCalledWith({ kind: 'success', taskName: 'monitors.json' });
  });
});
