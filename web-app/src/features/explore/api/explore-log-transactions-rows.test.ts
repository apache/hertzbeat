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
import { logTransactionDetailSchema } from './explore-log-transactions-schema';
const row = {
  logRecordUid: 'row-1',
  timeUnixNano: '1000000001',
  observedTimeUnixNano: null,
  severityNumber: 9,
  severityText: 'INFO',
  body: 'Related evidence',
  attributes: { 'request.id': 'req-1' },
  droppedAttributesCount: 0,
  traceId: null,
  spanId: null,
  traceFlags: 0,
  resource: { 'service.name': 'checkout' },
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
};
const result = {
  window: { start: 1000, end: 2000 },
  field: { id: 'attribute:request.id', source: 'attribute', key: 'request.id' },
  identity: 'req-1',
  qualified: true,
  total: 1,
  rows: [row],
  offset: 0,
  limit: 20,
  sort: 'oldest'
};
it('keeps nanosecond timestamps and exact native string identity in related rows', () => {
  expect(logTransactionDetailSchema.parse(result).rows[0]?.timeUnixNano).toBe('1000000001');
  for (const change of [
    { attributes: { 'request.id': 'another' } },
    { attributes: { 'request.id': 1 } },
    { timeUnixNano: '2000000001' },
    { timeUnixNano: null }
  ]) {
    expect(logTransactionDetailSchema.safeParse({ ...result, rows: [{ ...row, ...change }] }).success).toBe(false);
  }
});
it('requires chronological order while preserving same-time legacy rows without a UID', () => {
  expect(
    logTransactionDetailSchema.safeParse({ ...result, total: 2, rows: [{ ...row, timeUnixNano: '1999999999' }, row] })
      .success
  ).toBe(false);
  expect(
    logTransactionDetailSchema.safeParse({
      ...result,
      total: 2,
      rows: [
        { ...row, logRecordUid: null },
        { ...row, logRecordUid: null }
      ]
    }).success
  ).toBe(true);
});
