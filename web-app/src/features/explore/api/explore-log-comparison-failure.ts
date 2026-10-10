/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
