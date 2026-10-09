/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
