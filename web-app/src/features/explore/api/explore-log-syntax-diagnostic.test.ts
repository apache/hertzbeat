/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { ApiMessageError } from '@/core/http/api-message';
import { logSyntaxDiagnostic } from './explore-log-syntax-diagnostic';
const error = (data: unknown) => new ApiMessageError('observability_log_filter_invalid', { status: 400, data });
it.each(['structured-v1', 'structured-v2'])(
  'retains allowlisted UTF-16 positions for %s bound to the failed expression',
  syntax => {
    const expression = '"😀" service:';
    const data = { syntaxIssue: 'missing_value', start: expression.length, end: expression.length };
    expect(logSyntaxDiagnostic(error(data), expression, syntax)).toEqual({
      issue: 'missing_value',
      start: 13,
      end: 13,
      expression
    });
    for (const invalid of [
      { ...data, start: -1 },
      { ...data, end: 14 },
      { ...data, start: 1.5 },
      { ...data, start: 14 },
      { ...data, syntaxIssue: 'private diagnostic' },
      { ...data, end: undefined },
      { ...data, start: '13' }
    ]) {
      expect(logSyntaxDiagnostic(error(invalid), expression, syntax)).toBeUndefined();
    }
    expect(logSyntaxDiagnostic(error(data), expression, undefined)).toBeUndefined();
    expect(logSyntaxDiagnostic(error(data), expression, 'structured-v3')).toBeUndefined();
    expect(logSyntaxDiagnostic(error(null), expression, syntax)).toBeUndefined();
  }
);
