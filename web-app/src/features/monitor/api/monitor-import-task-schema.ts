/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { z } from 'zod';

import type { MonitorImportTask } from '../model/monitor-import-model';

const instantSchema = z.string().datetime({ offset: true });
const errorCodeSchema = z.enum(['IMPORT_UNSUPPORTED_TYPE', 'IMPORT_INVALID_CONTENT', 'IMPORT_FAILED']);
const taskSchema = z
  .object({
    schemaVersion: z.literal(1),
    taskId: z.string().uuid(),
    taskType: z.literal('MONITOR_IMPORT'),
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED']),
    progress: z.number().int().min(0).max(100),
    createdAt: instantSchema,
    startedAt: instantSchema,
    completedAt: instantSchema.nullish(),
    errorCode: errorCodeSchema.nullish()
  })
  .strict()
  .transform(value => ({ ...value, completedAt: value.completedAt ?? null, errorCode: value.errorCode ?? null }))
  .superRefine((value, context) => {
    if (!hasCoherentTaskEvidence(value)) context.addIssue({ code: 'custom' });
  });
const taskListSchema = z.array(taskSchema).max(20);
const canonicalRereadSchema = z
  .object({ schemaVersion: z.literal(1), delivery: z.literal('CANONICAL_REREAD') })
  .strict();

function hasCoherentTaskEvidence(value: MonitorImportTask) {
  const coherentStatus = hasInProgressEvidence(value) || hasCompletedEvidence(value) || hasFailedEvidence(value);
  const terminal = value.status !== 'IN_PROGRESS';
  return coherentStatus && terminal === (value.completedAt !== null);
}

function hasInProgressEvidence(value: MonitorImportTask) {
  return (
    value.status === 'IN_PROGRESS' && value.progress < 100 && value.completedAt === null && value.errorCode === null
  );
}

function hasCompletedEvidence(value: MonitorImportTask) {
  return (
    value.status === 'COMPLETED' && value.progress === 100 && value.completedAt !== null && value.errorCode === null
  );
}

function hasFailedEvidence(value: MonitorImportTask) {
  return value.status === 'FAILED' && value.progress < 100 && value.completedAt !== null && value.errorCode !== null;
}

class MonitorImportTaskContractError extends Error {
  constructor() {
    super('Invalid monitor import task response');
    this.name = 'MonitorImportTaskContractError';
  }
}

export function parseMonitorImportTask(value: unknown): MonitorImportTask {
  const parsed = taskSchema.safeParse(value);
  if (!parsed.success) throw new MonitorImportTaskContractError();
  return parsed.data;
}

export function parseMonitorImportTasks(value: unknown): MonitorImportTask[] {
  const parsed = taskListSchema.safeParse(value);
  if (!parsed.success) throw new MonitorImportTaskContractError();
  return parsed.data;
}

export function parseMonitorImportTaskReread(payload: string) {
  try {
    return canonicalRereadSchema.safeParse(JSON.parse(payload)).success;
  } catch {
    return false;
  }
}
