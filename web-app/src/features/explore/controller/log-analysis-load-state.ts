/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { ApiMessageError } from '@/core/http/api-message';
import type { UseQueryResult } from '@tanstack/react-query';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
function analysisFailureState(error: unknown): 'interval_too_small' | 'permission' | 'unavailable' | 'error' {
  if (
    error instanceof ApiMessageError &&
    error.status === 400 &&
    error.message === 'observability_log_analysis_interval_too_small'
  )
    return 'interval_too_small';
  const kind = classifyExploreSignalError(error);
  if (kind === 'permission') return 'permission';
  return kind === 'transport_error' ? 'unavailable' : 'error';
}

export function analysisLoadState(
  result: Pick<UseQueryResult<unknown>, 'isFetching' | 'isPending' | 'isError' | 'error'>,
  active: boolean
): 'idle' | 'loading' | 'ready' | 'interval_too_small' | 'permission' | 'unavailable' | 'error' {
  if (!active) return 'idle';
  if (result.isFetching || result.isPending) return 'loading';
  if (result.isError) return analysisFailureState(result.error);
  return 'ready';
}
