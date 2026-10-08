/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
