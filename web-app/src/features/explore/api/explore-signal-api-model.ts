/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import {
  ExploreSignalContractError,
  ExploreSignalMissingError,
  ExploreSignalUnavailableError
} from '../model/explore-signal-contract';

const requestFailureKinds = new Map<
  string,
  'invalid_filter' | 'invalid_query' | 'calculated_budget_exceeded' | 'calculated_invalid_pattern'
>([
  ['observability_log_filter_invalid', 'invalid_filter'],
  ['observability_query_context_invalid', 'invalid_query'],
  ['calculated_budget_exceeded', 'calculated_budget_exceeded'],
  ['calculated_invalid_pattern', 'calculated_invalid_pattern']
]);

export function classifyExploreSignalError(
  reason: unknown
):
  | 'missing'
  | 'permission'
  | 'transport_error'
  | 'contract_error'
  | 'invalid_query'
  | 'invalid_filter'
  | 'calculated_budget_exceeded'
  | 'calculated_invalid_pattern'
  | 'error' {
  if (reason instanceof ExploreSignalMissingError) return 'missing';
  if (reason instanceof ExploreSignalUnavailableError) return 'transport_error';
  if (reason instanceof ExploreSignalContractError) return 'contract_error';
  return reason instanceof ApiMessageError ? classifyApiMessageError(reason) : 'error';
}

function classifyApiMessageError(reason: ApiMessageError) {
  if (reason.status === 400) {
    const calculated = calculatedFailureReason(reason);
    if (calculated) return calculated;
    const kind = requestFailureKinds.get(reason.message);
    if (kind) return kind;
  }
  if (reason.status === 404 || (reason.status === 200 && reason.code === 3)) return 'missing';
  if (reason.status === 401 || reason.status === 403) return 'permission';
  if (reason.cause !== undefined || reason.status === undefined || [0, 502, 503, 504].includes(reason.status)) {
    return 'transport_error';
  }
  return 'error';
}

function calculatedFailureReason(reason: ApiMessageError) {
  const detail = reason.data;
  if (
    reason.message !== 'observability_log_filter_invalid' ||
    !detail ||
    typeof detail !== 'object' ||
    !('reason' in detail)
  )
    return undefined;
  return detail.reason === 'calculated_budget_exceeded' || detail.reason === 'calculated_invalid_pattern'
    ? detail.reason
    : undefined;
}

export function logFilterFailureReason(
  error: unknown
): import('../model/explore-log-filter-failure').LogFilterFailureReason | undefined {
  if (!(error instanceof ApiMessageError) || classifyExploreSignalError(error) !== 'invalid_filter') return undefined;
  const data = error.data;
  if (!data || typeof data !== 'object' || !('reason' in data)) return undefined;
  const reason = data.reason;
  const known = ['full_text_unsupported', 'cidr_unsupported', 'nested_path_unsupported', 'group_selection_unsupported'];
  return typeof reason === 'string' && known.includes(reason)
    ? (reason as import('../model/explore-log-filter-failure').LogFilterFailureReason)
    : undefined;
}
