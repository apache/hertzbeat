/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { z } from 'zod';

const maxTaskNameLength = 255;
const taskNameSchema = z.string().trim().min(1).max(maxTaskNameLength);
const commonFields = {
  managerEventType: z.literal('IMPORT_TASK_EVENT'),
  taskName: taskNameSchema
};
const managerImportTaskSchema = z.discriminatedUnion('notifyLevel', [
  z.object({
    ...commonFields,
    notifyLevel: z.literal('INFO'),
    progress: z.number().int().min(0).max(100),
    status: z.literal('IN_PROGRESS')
  }),
  z.object({
    ...commonFields,
    notifyLevel: z.literal('SUCCESS'),
    status: z.literal('COMPLETED')
  }),
  z.object({
    ...commonFields,
    notifyLevel: z.literal('ERROR'),
    status: z.literal('FAILED')
  })
]);

export type MonitorImportTaskEvent =
  | { kind: 'progress'; taskName: string; progress: number }
  | { kind: 'success'; taskName: string }
  | { kind: 'failure'; taskName: string };

/**
 * Projects the manager SSE payload to the small, safe contract required by
 * shell notifications. In particular, backend exception text is discarded.
 */
export function parseMonitorImportTaskEvent(payload: string): MonitorImportTaskEvent | null {
  try {
    const parsed = managerImportTaskSchema.safeParse(JSON.parse(payload));
    if (!parsed.success) return null;
    const event = parsed.data;
    if (event.notifyLevel === 'INFO') {
      return { kind: 'progress', taskName: event.taskName, progress: event.progress };
    }
    return { kind: event.notifyLevel === 'SUCCESS' ? 'success' : 'failure', taskName: event.taskName };
  } catch {
    return null;
  }
}
