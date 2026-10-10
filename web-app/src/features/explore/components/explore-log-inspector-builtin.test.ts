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
import type { LogRow } from '../model/explore-signal-contract';
import { logInspectorFields } from './explore-log-inspector-model';

const row: LogRow = {
  body: 'error',
  severityNumber: 17,
  severityText: 'CUSTOM',
  traceId: 'a'.repeat(32),
  spanId: 'b'.repeat(16),
  timeUnixNano: null,
  observedTimeUnixNano: null,
  droppedAttributesCount: null,
  traceFlags: null,
  resource: null,
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null,
  logRecordUid: null,
  attributes: null
};

it('derives status from the severity number and exposes supported builtin identities', () => {
  const fields = logInspectorFields(row);
  expect(fields.find(field => field.key === 'severity')).toMatchObject({
    value: 'CUSTOM',
    filter: { scope: 'builtin', key: 'status', value: 'ERROR' },
    analysis: { field: { id: 'builtin:severityCategory' }, numeric: false }
  });
  expect(fields.find(field => field.key === 'traceId')?.filter).toEqual({
    scope: 'builtin',
    key: 'trace_id',
    value: row.traceId
  });
  expect(fields.find(field => field.key === 'spanId')?.filter).toEqual({
    scope: 'builtin',
    key: 'span_id',
    value: row.spanId
  });
  expect(fields.find(field => field.key === 'message')?.filter).toBeUndefined();
  expect(
    logInspectorFields({ ...row, severityNumber: null, traceId: 'bad', spanId: '0'.repeat(16) })
      .filter(field => ['severity', 'traceId', 'spanId'].includes(field.key))
      .every(field => !field.filter)
  ).toBe(true);
});
