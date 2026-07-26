/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { parseMonitorImportTaskEvent } from './monitor-import-task-schema';

describe('monitor import task event contract', () => {
  it('projects the current manager payload to the bounded fields needed by the shell', () => {
    expect(
      parseMonitorImportTaskEvent(
        JSON.stringify({
          notifyLevel: 'INFO',
          managerEventType: 'IMPORT_TASK_EVENT',
          taskName: ' monitors.json ',
          progress: 40,
          status: 'IN_PROGRESS',
          errMsg: 'must stay at the transport boundary',
          unexpected: { nested: true }
        })
      )
    ).toEqual({
      kind: 'progress',
      taskName: 'monitors.json',
      progress: 40
    });
  });

  it('accepts terminal success and failure without exposing the server exception text', () => {
    expect(
      parseMonitorImportTaskEvent(
        JSON.stringify({
          notifyLevel: 'SUCCESS',
          managerEventType: 'IMPORT_TASK_EVENT',
          taskName: 'monitors.yaml',
          progress: null,
          status: 'COMPLETED',
          errMsg: null
        })
      )
    ).toEqual({ kind: 'success', taskName: 'monitors.yaml' });
    expect(
      parseMonitorImportTaskEvent(
        JSON.stringify({
          notifyLevel: 'ERROR',
          managerEventType: 'IMPORT_TASK_EVENT',
          taskName: 'monitors.xlsx',
          progress: null,
          status: 'FAILED',
          errMsg: 'jdbc:password=secret'
        })
      )
    ).toEqual({ kind: 'failure', taskName: 'monitors.xlsx' });
  });

  it.each([
    'not-json',
    '{}',
    '{"notifyLevel":"WARNING","managerEventType":"IMPORT_TASK_EVENT","taskName":"x","status":"FAILED"}',
    '{"notifyLevel":"INFO","managerEventType":"IMPORT_TASK_EVENT","taskName":"x","progress":101,"status":"IN_PROGRESS"}',
    '{"notifyLevel":"INFO","managerEventType":"OTHER","taskName":"x","progress":10,"status":"IN_PROGRESS"}',
    '{"notifyLevel":"SUCCESS","managerEventType":"IMPORT_TASK_EVENT","taskName":" ","status":"COMPLETED"}',
    '{"notifyLevel":"SUCCESS","managerEventType":"IMPORT_TASK_EVENT","taskName":"x","status":"FAILED"}'
  ])('rejects malformed or contradictory payload %s', payload => {
    expect(parseMonitorImportTaskEvent(payload)).toBeNull();
  });
});
