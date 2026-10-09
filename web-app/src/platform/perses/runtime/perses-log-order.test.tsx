/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with this work for additional information regarding copyright ownership. */
import { expect, it } from 'vitest';
import { LogsTableComponent } from '@perses-dev/logs-table-plugin/lib/LogsTableComponent';

it('native pinned plugin honors forward direction and stable ties without altering timestamps', () => {
  const entries = [
    { timestamp: 3, line: 'b', labels: {} },
    { timestamp: 1, line: 'a', labels: {} },
    { timestamp: 3, line: 'c', labels: {} }
  ];
  const input = (direction: 'forward' | 'backward') =>
    ({ spec: {}, queryResults: [{ data: { logs: { entries, direction } } }] }) as unknown as Parameters<
      typeof LogsTableComponent
    >[0];
  const lines = (direction: 'forward' | 'backward') => {
    const element = LogsTableComponent(input(direction));
    return (element?.props as { logs: typeof entries }).logs.map(row => row.line);
  };
  expect(lines('forward')).toEqual(['a', 'b', 'c']);
  expect(lines('backward')).toEqual(['b', 'c', 'a']);
  expect(entries.map(row => row.timestamp)).toEqual([3, 1, 3]);
});

it('preserves a single globally ordered server page when explicitly requested', () => {
  const entries = [
    { timestamp: 1, line: 'highest', labels: {} },
    { timestamp: 3, line: 'lowest', labels: {} }
  ];
  const input = {
    spec: {},
    queryResults: [{ data: { logs: { entries, direction: 'backward', preserveOrder: true } } }]
  };
  const element = LogsTableComponent(input as unknown as Parameters<typeof LogsTableComponent>[0]);
  expect((element?.props as { logs: typeof entries }).logs).toEqual(entries);
});
