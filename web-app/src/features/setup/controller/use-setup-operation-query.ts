/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { loadSetupOperation } from '../api/setup-api';
import { SetupContractError } from '../api/setup-schema';
import { setupQueryKeys } from './setup-query-keys';
import { setupPollDelay } from './setup-poll-backoff';

export function useSetupOperationQuery(operationId: string | null) {
  const failureBackoff = useRef<OperationFailureBackoff>({ operationId: null, errorUpdateCount: 0, attempts: 0 });
  return useQuery({
    queryKey: setupQueryKeys.operation(operationId ?? 'inactive'),
    queryFn: ({ signal }) => loadOperation(operationId, signal),
    enabled: Boolean(operationId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: query => operationPollInterval(query.state, operationId, failureBackoff.current)
  });
}

type OperationFailureBackoff = {
  operationId: string | null;
  errorUpdateCount: number;
  attempts: number;
};

function operationPollInterval(
  queryState: {
    data: { state: string; nextPollAfterMillis: number } | undefined;
    error: unknown;
    errorUpdateCount: number;
  },
  operationId: string | null,
  failureBackoff: OperationFailureBackoff
) {
  const operation = queryState.data;
  if (operation && operationSettled(operation.state)) return false;
  if (!operation && !queryState.error) return false;
  return setupPollDelay(operation?.nextPollAfterMillis, failureAttempts(queryState, operationId, failureBackoff));
}

function failureAttempts(
  queryState: { error: unknown; errorUpdateCount: number },
  operationId: string | null,
  failureBackoff: OperationFailureBackoff
) {
  if (failureBackoff.operationId !== operationId) {
    failureBackoff.operationId = operationId;
    failureBackoff.errorUpdateCount = 0;
    failureBackoff.attempts = 0;
  }
  if (!queryState.error) {
    failureBackoff.errorUpdateCount = queryState.errorUpdateCount;
    failureBackoff.attempts = 0;
    return 0;
  }
  if (queryState.errorUpdateCount > failureBackoff.errorUpdateCount) {
    failureBackoff.attempts += queryState.errorUpdateCount - failureBackoff.errorUpdateCount;
    failureBackoff.errorUpdateCount = queryState.errorUpdateCount;
  }
  return Math.max(1, failureBackoff.attempts);
}

function operationSettled(state: string) {
  return (
    state === 'succeeded' ||
    state === 'failed' ||
    state === 'rolled_back' ||
    state === 'awaiting_restart' ||
    state === 'awaiting_external_apply'
  );
}

function loadOperation(operationId: string | null, signal: AbortSignal) {
  if (!operationId) throw new SetupContractError();
  return loadSetupOperation(operationId, signal);
}
