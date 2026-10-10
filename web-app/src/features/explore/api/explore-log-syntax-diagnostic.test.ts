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
