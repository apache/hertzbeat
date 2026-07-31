/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { classifyCollectorRuntimeApplication } from './collector-runtime-report-model';

const report = {
  schemaVersion: 2 as const,
  enabled: true,
  state: 'RUNNING' as const,
  desiredRevision: 8,
  activeRevision: 7,
  failureCode: 'NONE' as const,
  rejectedRevisions: [],
  sources: [],
  reportedAt: '2026-07-22T10:01:05Z'
};

describe('Collector runtime report model', () => {
  it('distinguishes no report, waiting, applied, rejected, and superseded revisions', () => {
    expect(classifyCollectorRuntimeApplication(8, null)).toEqual({
      kind: 'unknown',
      expectedRevision: 8,
      reason: 'not-reported'
    });
    expect(classifyCollectorRuntimeApplication(8, report)).toMatchObject({
      kind: 'waiting',
      desiredRevision: 8,
      activeRevision: 7
    });
    expect(classifyCollectorRuntimeApplication(8, { ...report, activeRevision: 8 })).toMatchObject({
      kind: 'applied',
      revision: 8
    });
    expect(
      classifyCollectorRuntimeApplication(8, {
        ...report,
        failureCode: 'PORT_CONFLICT',
        rejectedRevisions: [8]
      })
    ).toMatchObject({
      kind: 'rejected',
      expectedRevision: 8,
      failureCode: 'PORT_CONFLICT'
    });
    expect(classifyCollectorRuntimeApplication(8, { ...report, failureCode: 'CONFIGURATION_ERROR' })).toMatchObject({
      kind: 'waiting'
    });
    expect(classifyCollectorRuntimeApplication(8, { ...report, desiredRevision: 9, activeRevision: 9 })).toMatchObject({
      kind: 'superseded',
      expectedRevision: 8,
      desiredRevision: 9
    });
  });
});
