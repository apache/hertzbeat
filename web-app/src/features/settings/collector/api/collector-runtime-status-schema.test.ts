/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { CollectorContractError } from '../model/collector-model';
import { parseCollectorRuntimeReport } from './collector-runtime-status-schema';

describe('Collector runtime status boundary', () => {
  it('projects safe revision evidence and discards diagnostics', () => {
    const privateDiagnostic = 'authorization=must-not-enter-domain';
    const result = parseCollectorRuntimeReport(
      {
        schemaVersion: 2,
        enabled: true,
        state: 'RUNNING',
        desiredRevision: 8,
        activeRevision: 7,
        pid: 4242,
        intakeCredentialState: 'CONFIGURED',
        restartCount: 1,
        changedAt: '2026-07-22T10:01:00Z',
        lastError: privateDiagnostic,
        failureCode: 'CONFIGURATION_ERROR',
        telemetry: { privateDiagnostic },
        sources: [
          {
            type: 'PROMETHEUS',
            name: 'payments',
            revision: 8,
            state: 'REJECTED',
            lastError: privateDiagnostic
          }
        ]
      },
      '2026-07-22T10:01:05Z'
    );

    expect(result).toEqual({
      schemaVersion: 2,
      enabled: true,
      state: 'RUNNING',
      desiredRevision: 8,
      activeRevision: 7,
      failureCode: 'CONFIGURATION_ERROR',
      rejectedRevisions: [8],
      reportedAt: '2026-07-22T10:01:05Z'
    });
    expect(JSON.stringify(result)).not.toContain(privateDiagnostic);
  });

  it('requires an exact status and report timestamp pair', () => {
    expect(parseCollectorRuntimeReport(null, null)).toBeNull();
    expect(() => parseCollectorRuntimeReport(null, '2026-07-22T10:01:05Z')).toThrow(CollectorContractError);
    expect(() =>
      parseCollectorRuntimeReport(
        {
          schemaVersion: 2,
          enabled: true,
          state: 'RUNNING',
          desiredRevision: 8,
          activeRevision: 8,
          pid: 4242,
          intakeCredentialState: 'CONFIGURED',
          restartCount: 1,
          changedAt: '2026-07-22T10:01:00Z',
          lastError: '',
          failureCode: 'NONE',
          telemetry: {},
          sources: [],
          unexpected: true
        },
        '2026-07-22T10:01:05Z'
      )
    ).toThrow(CollectorContractError);
  });
});
