/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logSyntaxDiagnostic } from './explore-log-syntax-diagnostic';
import { ApiMessageError } from '@/core/http/api-message';
import { classifyExploreSignalError, logFilterFailureReason } from './explore-signal-api-model';
import type { LogComparisonLoad } from '@/features/explore/model/explore-log-comparison-result';
type SubmittedSources = {
  a: { query?: string | undefined; searchSyntax?: string | undefined };
  b?: { search: string; searchSyntax?: string | undefined } | undefined;
};
export function comparisonFilterFailure(
  error: unknown,
  sources?: SubmittedSources
): LogComparisonLoad['invalidFilter'] {
  if (!(error instanceof ApiMessageError) || classifyExploreSignalError(error) !== 'invalid_filter') return undefined;
  const source = comparisonSource(error.data);
  const diagnostic = submittedDiagnostic(error, source, sources);
  return { ...(diagnostic ? { diagnostic } : {}), reason: logFilterFailureReason(error), source };
}
function comparisonSource(data: unknown) {
  if (!data || typeof data !== 'object' || !('source' in data)) return undefined;
  return data.source === 'a' || data.source === 'b' ? data.source : undefined;
}
function submittedDiagnostic(error: unknown, source: 'a' | 'b' | undefined, sources: SubmittedSources | undefined) {
  if (!source || !sources) return undefined;
  if (source === 'a') return logSyntaxDiagnostic(error, sources.a.query, sources.a.searchSyntax, source);
  return logSyntaxDiagnostic(error, sources.b?.search, sources.b?.searchSyntax, source);
}
