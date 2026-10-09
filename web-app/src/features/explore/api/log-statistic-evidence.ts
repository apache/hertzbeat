/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { classifyExploreSignalError } from './explore-signal-api-model';
import type { LogStatisticEvidence } from '../model/explore-signal-contract';

export function logStatisticEvidence<T>(result: PromiseSettledResult<T>): LogStatisticEvidence<T> {
  if (result.status === 'fulfilled') return { kind: 'ready', data: result.value };
  return classifyExploreSignalError(result.reason) === 'permission'
    ? { kind: 'error', reason: 'permission' }
    : { kind: 'error' };
}
