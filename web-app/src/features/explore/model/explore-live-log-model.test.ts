/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { markLogArrival, logArrival } from '@/shared/log-arrival';
import { expect, it } from 'vitest';
import { createLiveLogMapper, liveBufferWindow, liveTraceWindow } from './explore-live-log-model';
import type { LiveLogRow } from './explore-signal-contract';
const row = { timeUnixNano: 1750000000000000000, observedTimeUnixNano: null, body: 'first' } as LiveLogRow;
it('keeps simultaneous records distinct and preserves identity across incoming batches without inventing a UID', () => {
  const map = createLiveLogMapper();
  const other = { ...row, body: 'second' };
  expect(map(row)).toBe(map(row));
  expect(map(row)).not.toBe(map(other));
  expect(map(row)).toMatchObject({ timeUnixNano: String(row.timeUnixNano), logRecordUid: null, body: 'first' });
});
it('uses only received buffer bounds and pads a single instant by one millisecond', () => {
  const map = createLiveLogMapper();
  expect(liveBufferWindow([])).toBeUndefined();
  expect(liveBufferWindow([map(row)])).toEqual({ from: 1750000000000, to: 1750000000001 });
  expect(liveBufferWindow([map(row), map({ ...row, timeUnixNano: 1750000001000000000 })])).toEqual({
    from: 1750000000000,
    to: 1750000001000
  });
});
it('captures the selected preset duration ending no earlier than selection or log timestamp', () => {
  const map = createLiveLogMapper();
  expect(liveTraceWindow('last-30m', map(row), 1750001000000)).toEqual({ from: 1749999200000, to: 1750001000000 });
  expect(liveTraceWindow('last-15m', map(row), 1749999990000)).toEqual({ from: 1749999100000, to: 1750000000000 });
});

it('treats OTLP zero timestamps as absent and uses the real observed time for live table bounds', () => {
  const map = createLiveLogMapper();
  const observed = map({ ...row, timeUnixNano: 0, observedTimeUnixNano: row.timeUnixNano });
  expect(observed.timeUnixNano).toBeNull();
  expect(observed.observedTimeUnixNano).toBe(String(row.timeUnixNano));
  expect(liveBufferWindow([observed])).toEqual({ from: 1750000000000, to: 1750000000001 });
  expect(liveBufferWindow([map({ ...row, timeUnixNano: 0, observedTimeUnixNano: 0 })])).toBeUndefined();
});

it('preserves the original arrival token through live mapping', () => {
  const incoming = { ...row };
  markLogArrival(incoming);
  const map = createLiveLogMapper();
  expect(logArrival(map(incoming))).toBe(logArrival(incoming));
});
