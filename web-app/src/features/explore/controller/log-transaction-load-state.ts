/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { UseQueryResult } from '@tanstack/react-query';
import { classifyExploreSignalError, logFilterFailureReason } from '../api/explore-signal-api-model';
import { logSyntaxDiagnostic } from '../api/explore-log-syntax-diagnostic';
import { analysisLoadState } from './log-analysis-load-state';
export function transactionLoadState(
  result: Pick<UseQueryResult<unknown>, 'isFetching' | 'isPending' | 'isError' | 'error'>,
  active: boolean,
  expression: string | undefined,
  syntax: string | undefined
) {
  const state = analysisLoadState(result, active);
  const invalid = state === 'error' && classifyExploreSignalError(result.error) === 'invalid_filter';
  return {
    state: invalid ? ('invalid_filter' as const) : state,
    invalidFilterReason: invalid ? logFilterFailureReason(result.error) : undefined,
    syntaxDiagnostic: invalid ? logSyntaxDiagnostic(result.error, expression, syntax) : undefined
  };
}
