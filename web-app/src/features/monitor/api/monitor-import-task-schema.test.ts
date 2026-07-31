/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { parseMonitorImportTask, parseMonitorImportTaskReread } from './monitor-import-task-schema';

const task = {
  schemaVersion: 1,
  taskId: '123e4567-e89b-42d3-a456-426614174000',
  taskType: 'MONITOR_IMPORT',
  status: 'IN_PROGRESS',
  progress: 40,
  createdAt: '2026-07-31T12:00:00Z',
  startedAt: '2026-07-31T12:00:00Z',
  completedAt: null,
  errorCode: null
} as const;

describe('monitor import task contract', () => {
  it('parses the exact canonical task and normalizes omitted nullable fields', () => {
    expect(parseMonitorImportTask(task)).toEqual(task);
    expect(parseMonitorImportTask({ ...task, completedAt: undefined, errorCode: undefined })).toEqual(task);
  });

  it('accepts only coherent terminal states and safe failure codes', () => {
    expect(
      parseMonitorImportTask({
        ...task,
        status: 'COMPLETED',
        progress: 100,
        completedAt: '2026-07-31T12:00:10Z'
      })
    ).toMatchObject({ status: 'COMPLETED', progress: 100, errorCode: null });
    expect(
      parseMonitorImportTask({
        ...task,
        status: 'FAILED',
        completedAt: '2026-07-31T12:00:10Z',
        errorCode: 'IMPORT_INVALID_CONTENT'
      })
    ).toMatchObject({ status: 'FAILED', errorCode: 'IMPORT_INVALID_CONTENT' });
  });

  it.each([
    { ...task, schemaVersion: 2 },
    { ...task, taskId: 'not-a-uuid' },
    { ...task, taskType: 'OTHER' },
    { ...task, progress: 101 },
    { ...task, status: 'COMPLETED', progress: 99, completedAt: '2026-07-31T12:00:10Z' },
    { ...task, status: 'FAILED', completedAt: '2026-07-31T12:00:10Z', errorCode: 'PRIVATE_EXCEPTION' },
    { ...task, status: 'IN_PROGRESS', errorCode: 'IMPORT_FAILED' },
    { ...task, privateMessage: 'must not cross the contract' }
  ])('rejects malformed or contradictory task evidence %#', value => {
    expect(() => parseMonitorImportTask(value)).toThrow('Invalid monitor import task response');
  });

  it('accepts only canonical-reread manager signals and never projects task state from SSE', () => {
    expect(parseMonitorImportTaskReread('{"schemaVersion":1,"delivery":"CANONICAL_REREAD"}')).toBe(true);
    expect(
      parseMonitorImportTaskReread(
        '{"schemaVersion":1,"delivery":"CANONICAL_REREAD","status":"COMPLETED","taskId":"private"}'
      )
    ).toBe(false);
    expect(parseMonitorImportTaskReread('{"schemaVersion":1,"delivery":"DIRECT"}')).toBe(false);
    expect(parseMonitorImportTaskReread('not-json')).toBe(false);
  });
});
