/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const collectorRuntimeStates = ['STOPPED', 'STARTING', 'RUNNING', 'DEGRADED', 'STOPPING', 'FAILED'] as const;
export const collectorRuntimeFailureCodes = [
  'NONE',
  'CONFIGURATION_ERROR',
  'PORT_CONFLICT',
  'BACKEND_UNAVAILABLE',
  'AUTHENTICATION_FAILED',
  'QUEUE_FULL',
  'STORAGE_FULL',
  'STORAGE_CORRUPTED',
  'PROCESS_CRASH',
  'UNKNOWN'
] as const;
export const collectorRuntimeSourceTypes = ['HOST_METRICS', 'PROMETHEUS', 'FILE_LOG'] as const;
export const collectorRuntimeSourceStates = ['DESIRED', 'ACTIVE', 'REJECTED'] as const;

type CollectorRuntimeState = (typeof collectorRuntimeStates)[number];
type CollectorRuntimeFailureCode = (typeof collectorRuntimeFailureCodes)[number];
type CollectorRuntimeSourceType = (typeof collectorRuntimeSourceTypes)[number];
type CollectorRuntimeSourceState = (typeof collectorRuntimeSourceStates)[number];

export type CollectorRuntimeSourceReport = {
  type: CollectorRuntimeSourceType;
  name: string;
  revision: number;
  state: CollectorRuntimeSourceState;
};

/** Safe revision evidence projected from a Collector heartbeat report. */
export type CollectorRuntimeReport = {
  schemaVersion: 1 | 2;
  enabled: boolean;
  state: CollectorRuntimeState;
  desiredRevision: number;
  activeRevision: number;
  failureCode: CollectorRuntimeFailureCode;
  rejectedRevisions: number[];
  sources: CollectorRuntimeSourceReport[];
  reportedAt: string;
};

export type CollectorRuntimeApplication =
  | {
      kind: 'unknown';
      expectedRevision: number;
      reason: 'not-reported' | 'permission' | 'unavailable' | 'error';
    }
  | {
      kind: 'waiting';
      expectedRevision: number;
      desiredRevision: number;
      activeRevision: number;
      reportedAt: string;
    }
  | { kind: 'applied'; revision: number; state: CollectorRuntimeState; reportedAt: string }
  | {
      kind: 'rejected';
      expectedRevision: number;
      activeRevision: number;
      failureCode: CollectorRuntimeFailureCode;
      reportedAt: string;
    }
  | { kind: 'superseded'; expectedRevision: number; desiredRevision: number; reportedAt: string };

export type CollectorRuntimeSaveState = {
  kind: 'management-saved';
  collector: string;
  revision: number;
  application: CollectorRuntimeApplication;
};

export function classifyCollectorRuntimeApplication(
  expectedRevision: number,
  report: CollectorRuntimeReport | null
): CollectorRuntimeApplication {
  if (!report) return { kind: 'unknown', expectedRevision, reason: 'not-reported' };
  if (report.desiredRevision > expectedRevision) {
    return {
      kind: 'superseded',
      expectedRevision,
      desiredRevision: report.desiredRevision,
      reportedAt: report.reportedAt
    };
  }
  if (report.desiredRevision === expectedRevision && report.activeRevision === expectedRevision) {
    return {
      kind: 'applied',
      revision: expectedRevision,
      state: report.state,
      reportedAt: report.reportedAt
    };
  }
  if (
    report.desiredRevision === expectedRevision &&
    report.activeRevision < expectedRevision &&
    report.rejectedRevisions.includes(expectedRevision)
  ) {
    return {
      kind: 'rejected',
      expectedRevision,
      activeRevision: report.activeRevision,
      failureCode: report.failureCode,
      reportedAt: report.reportedAt
    };
  }
  return {
    kind: 'waiting',
    expectedRevision,
    desiredRevision: report.desiredRevision,
    activeRevision: report.activeRevision,
    reportedAt: report.reportedAt
  };
}

export function collectorRuntimeApplicationSettled(application: CollectorRuntimeApplication) {
  return application.kind === 'applied' || application.kind === 'rejected' || application.kind === 'superseded';
}
