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

import { z } from 'zod';
import { ApiMessageError } from '@/core/http/api-message';
import { classifyExploreSignalError } from './explore-signal-api-model';
import type { LogSyntaxDiagnostic } from '../model/explore-log-filter-failure';
const diagnosticSchema = z.object({
  syntaxIssue: z.enum(['missing_value', 'unclosed_group', 'incomplete_range', 'unclosed_quote', 'unexpected_token']),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  source: z.enum(['a', 'b']).optional()
});
export function logSyntaxDiagnostic(
  error: unknown,
  expression: string | undefined,
  syntax: string | undefined,
  source: 'a' | 'b' = 'a'
): LogSyntaxDiagnostic | undefined {
  if (
    (syntax !== 'structured-v1' && syntax !== 'structured-v2') ||
    expression === undefined ||
    !(error instanceof ApiMessageError) ||
    classifyExploreSignalError(error) !== 'invalid_filter'
  )
    return undefined;
  const parsed = diagnosticSchema.safeParse(error.data);
  if (!parsed.success) return undefined;
  const data = parsed.data;
  if (data.source !== undefined && data.source !== source) return undefined;
  if (data.start > data.end || data.end > expression.length) return undefined;
  return { issue: data.syntaxIssue, start: data.start, end: data.end, expression };
}
