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

import { logSeverityCategory } from '@/shared/log-severity';
import type { LogInspectorAnalysisTarget } from './explore-log-inspector-analysis';
import type { LogColumn } from './explore-log-columns';
import type { LogInspectorFilterTarget } from './explore-log-inspector-filter';
import type { LogRow } from './explore-signal-contract';

export type InspectorField = {
  analysis?: LogInspectorAnalysisTarget | undefined;
  column?: LogColumn;
  key: string;
  path?: string[];
  value: string | null;
  filter?: LogInspectorFilterTarget;
};

export function builtinInspectorFields(row: LogRow): InspectorField[] {
  const severity = logSeverityCategory(row.severityNumber);
  const fields: InspectorField[] = [
    {
      key: 'severity',
      path: ['severityText'],
      value: row.severityText,
      column: { kind: 'severity' },
      ...(severity
        ? {
            filter: { scope: 'builtin', key: 'status', value: severity },
            analysis: {
              field: { id: 'builtin:severityCategory', source: 'builtin', key: 'severityCategory' },
              numeric: false
            }
          }
        : {})
    }
  ];
  for (const key of ['traceId', 'spanId'] as const) {
    const value = row[key];
    if (value !== null)
      fields.push({
        key,
        path: [key],
        value,
        column: { kind: key },
        ...(/^[0-9a-f]+$/u.test(value) && !/^0+$/u.test(value) && value.length === (key === 'traceId' ? 32 : 16)
          ? { filter: { scope: 'builtin', key: key === 'traceId' ? 'trace_id' : 'span_id', value } }
          : {})
      });
  }
  return fields;
}
