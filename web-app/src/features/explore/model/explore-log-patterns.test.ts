/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { groupLogPatterns } from './explore-log-patterns';
import type { LogRow } from './explore-signal-contract';

const row = (body: LogRow['body'], service: string, severity: string, uid: string): LogRow => ({
  logRecordUid: uid,
  timeUnixNano: '1790143011000000000',
  observedTimeUnixNano: null,
  severityNumber: 9,
  severityText: severity,
  body,
  attributes: null,
  droppedAttributesCount: null,
  traceId: null,
  spanId: null,
  traceFlags: null,
  resource: { 'service.name': service },
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
});

it('groups only sampled string messages and retains exact members and service/status boundaries', () => {
  const result = groupLogPatterns(
    [
      row('payment 123 failed', 'checkout', 'ERROR', 'a'),
      row('payment 456 failed', 'checkout', 'ERROR', 'b'),
      row('payment 789 failed', 'billing', 'ERROR', 'c'),
      row('payment 789 failed', 'checkout', 'INFO', 'd'),
      row({ message: 'payment 999 failed' }, 'checkout', 'ERROR', 'e')
    ],
    12
  );
  expect(result.sampled).toBe(5);
  expect(result.total).toBe(12);
  expect(result.excluded).toBe(1);
  expect(result.groups).toHaveLength(3);
  expect(result.groups[0]).toMatchObject({ template: 'payment ? failed', service: 'checkout', severity: 'ERROR' });
  expect(result.groups[0]?.rows.map(item => item.logRecordUid)).toEqual(['a', 'b']);
});

it('does not invent groups for empty samples', () => {
  expect(groupLogPatterns([], 0)).toMatchObject({ sampled: 0, total: 0, excluded: 0, groups: [] });
});

it('keeps distinct severity numbers separate when OTLP severityText is absent', () => {
  const info = { ...row('task 1 failed', 'checkout', 'INFO', 'a'), severityText: null, severityNumber: 9 };
  const error = { ...row('task 2 failed', 'checkout', 'ERROR', 'b'), severityText: null, severityNumber: 17 };
  expect(groupLogPatterns([info, error], 2).groups).toHaveLength(2);
});

it('keeps enriched service_name identities separate when service.name is absent', () => {
  const checkout = { ...row('task 1 failed', 'checkout', 'ERROR', 'a'), resource: { service_name: 'checkout' } };
  const billing = { ...row('task 2 failed', 'billing', 'ERROR', 'b'), resource: { service_name: 'billing' } };
  expect(groupLogPatterns([checkout, billing], 2).groups).toHaveLength(2);
});
