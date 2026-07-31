/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { waitForCollectorRuntimeApplication } from './collector-runtime-report-convergence';

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

describe('Collector runtime report convergence', () => {
  it('polls a pending report until the requested revision is active', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(report)
      .mockResolvedValueOnce({
        ...report,
        activeRevision: 8
      });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(waitForCollectorRuntimeApplication('edge', 8, { read, wait, attempts: 3 })).resolves.toMatchObject({
      kind: 'applied',
      revision: 8
    });
    expect(read).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it('returns honest pending, rejected, superseded, permission, and unavailable states', async () => {
    await expect(
      waitForCollectorRuntimeApplication('edge', 8, {
        read: () => Promise.resolve(report),
        wait: () => Promise.resolve(),
        attempts: 1
      })
    ).resolves.toMatchObject({ kind: 'waiting', activeRevision: 7 });
    await expect(
      waitForCollectorRuntimeApplication('edge', 8, {
        read: () =>
          Promise.resolve({
            ...report,
            failureCode: 'PORT_CONFLICT',
            rejectedRevisions: [8]
          }),
        attempts: 1
      })
    ).resolves.toMatchObject({ kind: 'rejected', failureCode: 'PORT_CONFLICT' });
    await expect(
      waitForCollectorRuntimeApplication('edge', 8, {
        read: () => Promise.resolve({ ...report, desiredRevision: 9, activeRevision: 9 }),
        attempts: 1
      })
    ).resolves.toMatchObject({ kind: 'superseded', desiredRevision: 9 });
    await expect(
      waitForCollectorRuntimeApplication('edge', 8, {
        read: () => Promise.reject(new ApiMessageError('private', { status: 403 }))
      })
    ).resolves.toEqual({ kind: 'unknown', expectedRevision: 8, reason: 'permission' });
    await expect(
      waitForCollectorRuntimeApplication('edge', 8, {
        read: () => Promise.reject(new ApiMessageError('private', { status: 503 }))
      })
    ).resolves.toEqual({ kind: 'unknown', expectedRevision: 8, reason: 'unavailable' });
  });
});
