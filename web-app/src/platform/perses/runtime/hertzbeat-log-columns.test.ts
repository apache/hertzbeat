/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { decorateLogColumns, logColumnGrid } from './hertzbeat-log-columns';
it('gives service and resource fields flexible tracks while keeping the time minimum stable', () => {
  const grid = logColumnGrid([
    { id: 'time', label: 'Time', kind: 'time' },
    { id: 'host', label: 'Host', kind: 'field' },
    { id: 'service', label: 'Service', kind: 'service' },
    { id: 'message', label: 'Message', kind: 'message' }
  ]);
  expect(grid).toContain('144px');
  expect(grid).toContain('minmax(138px,');
  expect(grid).toContain('minmax(106px,');
  expect(grid).toContain('minmax(200px,');
});
it('distinguishes empty custom fields from missing values without changing the supplied value', () => {
  const row = document.createElement('div');
  row.append(document.createElement('div'));
  const values = ['', undefined, '0', 'false'];
  decorateLogColumns(
    row,
    0,
    values.map((value, index) => ({ id: String(index), label: String(index), kind: 'field', getValue: () => value }))
  );
  const cells = [...row.querySelectorAll('[data-hertzbeat-log-field]')];
  expect(cells.map(cell => cell.textContent)).toEqual(['""', '—', '0', 'false']);
  expect(cells[0]).toHaveAttribute('title', '""');
  expect(values[0]).toBe('');
});

it('keeps repeated column decoration stable when a native cell is hidden', () => {
  const row = document.createElement('div');
  const content = document.createElement('div');
  const time = document.createElement('time');
  const severity = document.createElement('span');
  severity.dataset.hertzbeatLogSeverityText = 'true';
  const message = document.createElement('div');
  message.textContent = 'body';
  content.append(time, severity, message);
  row.append(content);
  const columns = [
    { id: 'time', label: 'Time', kind: 'time' as const },
    { id: 'message', label: 'Message', kind: 'message' as const }
  ];
  decorateLogColumns(row, 0, columns);
  const observer = new MutationObserver(() => {});
  observer.observe(content, { childList: true, subtree: true });
  decorateLogColumns(row, 0, columns);
  expect(observer.takeRecords()).toHaveLength(0);
  observer.disconnect();
  expect(severity.hidden).toBe(true);
});
