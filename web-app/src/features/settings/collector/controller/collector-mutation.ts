/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { ApiMessageError } from '@/core/http/api-message';
import { apiMessageWriteOutcome } from '@/core/http/api-message-write-evidence';

import type { CollectorMutationCommand, CollectorMutationFailure, CollectorRecord } from '../model/collector-model';

export function collectorMutationConverged(
  command: CollectorMutationCommand,
  projection: Pick<CollectorRecord, 'name' | 'online'>[]
) {
  const records = new Map(projection.map(record => [record.name, record]));
  return command.collectors.every(name => {
    const record = records.get(name);
    if (command.action === 'delete') return record === undefined;
    return record !== undefined && record.online === (command.action === 'online');
  });
}

export function classifyCollectorMutationFailure(error: unknown): CollectorMutationFailure {
  if (!(error instanceof ApiMessageError)) return 'error';
  if (error.status === 401 || error.status === 403) return 'permission';
  if (error.status !== undefined && error.status >= 400 && error.status < 500) return 'validation';
  if (error.code !== undefined) return 'validation';
  return error.status === undefined || error.status === 0 || error.status >= 500 || error.cause !== undefined
    ? 'unavailable'
    : 'error';
}

type CollectorProjection = Pick<CollectorRecord, 'name' | 'online'>[];

export async function executeCollectorMutation(
  command: CollectorMutationCommand,
  write: (command: CollectorMutationCommand) => Promise<unknown>,
  reread: () => Promise<CollectorProjection>
) {
  try {
    await write(command);
  } catch (error) {
    const failure = classifyCollectorMutationFailure(error);
    if (!collectorMutationNeedsProof(error)) return { kind: 'failed' as const, failure };
    try {
      const projection = await reread();
      // An uncertain write leaves the outcome ambiguous. The projection is
      // evidence for the operator, not permission to report mutation success.
      return { kind: 'failed' as const, failure, projection };
    } catch {
      return { kind: 'failed' as const, failure };
    }
  }

  try {
    const projection = await reread();
    if (collectorMutationConverged(command, projection)) {
      return { kind: 'confirmed' as const, projection };
    }
    return { kind: 'failed' as const, failure: 'validation' as const, projection };
  } catch (error) {
    return {
      kind: 'failed' as const,
      failure: classifyCollectorMutationFailure(error) === 'error' ? ('error' as const) : ('unavailable' as const)
    };
  }
}

function collectorMutationNeedsProof(error: unknown) {
  return !(error instanceof ApiMessageError) || apiMessageWriteOutcome(error) === 'uncertain';
}
