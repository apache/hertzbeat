/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ReactNode } from 'react';
export type HertzBeatLogColumn = {
  id: string;
  label: string;
  header?: ReactNode;
  ariaSort?: 'ascending' | 'descending' | 'none' | undefined;
  reorderable?: boolean | undefined;
  actions?: HertzBeatLogColumnActions | undefined;
  kind: 'time' | 'severity' | 'service' | 'message' | 'field';
  getValue?: ((index: number) => string | undefined) | undefined;
};
type HertzBeatLogColumnActionOption = { id: string; label: string };
type HertzBeatLogColumnActions = {
  menuLabel: string;
  calculateField: string;
  showCalculate: boolean;
  moveLeft: string;
  moveRight: string;
  showMove: boolean;
  insertLeft: string;
  insertRight: string;
  replace: string;
  remove: string;
  moveLeftDisabled: boolean;
  moveRightDisabled: boolean;
  insertLeftDisabled: boolean;
  insertRightDisabled: boolean;
  replaceDisabled: boolean;
  removeDisabled: boolean;
  insertOptions: HertzBeatLogColumnActionOption[];
  replaceOptions: HertzBeatLogColumnActionOption[];
  onAction: (action: string) => void;
};
const COLUMN_WIDTH = { time: 144, severity: 70, service: 106, message: 200, field: 138 };
export function logColumnGrid(columns: HertzBeatLogColumn[]) {
  return columns
    .map(column => {
      const width = COLUMN_WIDTH[column.kind];
      if (column.kind === 'message') return `minmax(${width}px, 1.6fr)`;
      if (column.kind === 'field') return `minmax(${width}px, 1fr)`;
      if (column.kind === 'service') return `minmax(${width}px, 0.7fr)`;
      return `${width}px`;
    })
    .join(' ');
}
export function decorateLogColumns(
  row: HTMLElement,
  index: number,
  columns: HertzBeatLogColumn[],
  rowHeight: 'small' | 'medium' | 'large' = 'small',
  showContent = true,
  showTime = true
) {
  const content = row.firstElementChild;
  if (!(content instanceof HTMLElement)) return;
  const native = {
    time: content.querySelector('time'),
    severity: content.querySelector('[data-hertzbeat-log-severity-text]'),
    service: content.querySelector('[data-hertzbeat-log-service]'),
    message: content.querySelector(':scope > div:last-of-type')
  };
  const selected = new Set<HTMLElement>();
  const visible = columns.filter(
    column => (showContent || column.kind !== 'message') && (showTime || column.kind !== 'time')
  );
  visible.forEach((column, position) => {
    const cell = resolveColumnCell(content, native, column);
    if (!(cell instanceof HTMLElement)) return;
    selected.add(cell);
    const value = column.getValue?.(index);
    const text = value === '' ? '""' : (value ?? '—');
    if (column.kind === 'field') {
      if (cell.textContent !== text) cell.textContent = text;
      cell.title = text;
    }
    cell.hidden = false;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-colindex', String(position + 1));
    cell.removeAttribute('aria-hidden');
    const expandedMessage = column.kind === 'message' && rowHeight !== 'small';
    cell.style.setProperty('grid-column', expandedMessage ? '1 / -1' : String(position + 1), 'important');
    cell.style.setProperty('grid-row', expandedMessage ? '2' : '1', 'important');
  });
  const ordered = visible.flatMap(column => resolveColumnCell(content, native, column) ?? []);
  const current = Array.from(content.children).filter(cell => selected.has(cell as HTMLElement));
  if (ordered.some((cell, position) => current[position] !== cell)) for (const cell of ordered) content.append(cell);
  for (const child of Array.from(content.children))
    if (child instanceof HTMLElement && !selected.has(child)) {
      child.hidden = true;
      child.removeAttribute('role');
      child.removeAttribute('aria-colindex');
      child.setAttribute('aria-hidden', 'true');
    }
  content.style.setProperty('grid-template-columns', logColumnGrid(visible), 'important');
  if (rowHeight !== 'small') content.style.setProperty('row-gap', '0', 'important');
  else content.style.removeProperty('row-gap');
  content.dataset.hertzbeatCustomColumns = 'true';
}

function resolveColumnCell(
  content: HTMLElement,
  native: Record<'time' | 'severity' | 'service' | 'message', Element | null>,
  column: HertzBeatLogColumn
): HTMLElement | undefined {
  if (column.kind !== 'field') {
    const cell = native[column.kind];
    return cell instanceof HTMLElement ? cell : undefined;
  }
  const existing = Array.from(content.querySelectorAll<HTMLElement>('[data-hertzbeat-log-field]')).find(
    item => item.dataset.hertzbeatLogField === column.id
  );
  if (existing) return existing;
  const cell = document.createElement('span');
  cell.dataset.hertzbeatLogField = column.id;
  content.append(cell);
  return cell;
}

export function logColumnMinimumWidth(columns: HertzBeatLogColumn[]) {
  return columns.reduce((width, column) => width + COLUMN_WIDTH[column.kind], 24 + 12 * (columns.length - 1));
}
export function resetLogColumns(row: HTMLElement) {
  const content = row.firstElementChild;
  if (!(content instanceof HTMLElement) || !content.dataset.hertzbeatCustomColumns) return;
  for (const cell of content.querySelectorAll('[data-hertzbeat-log-field]')) cell.remove();
  for (const cell of Array.from(content.children))
    if (cell instanceof HTMLElement) {
      cell.hidden = false;
      cell.style.removeProperty('grid-column');
      cell.style.removeProperty('grid-row');
    }
  content.style.removeProperty('grid-template-columns');
  content.style.removeProperty('row-gap');
  delete content.dataset.hertzbeatCustomColumns;
}
