/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { formatShortLocalTime } from '@/shared/time';

export const interactiveSelector = 'button, a, input, select, textarea, [role="button"], [role="link"]';

export function logIndex(row: HTMLElement) {
  const value = row.dataset.logIndex;
  if (value == null || !/^\d+$/u.test(value)) return undefined;
  const index = Number(value);
  return Number.isSafeInteger(index) ? index : undefined;
}

export function resolveRovingIndex(
  rows: HTMLElement[],
  selectedIndex: number | undefined,
  rovingIndex: number | undefined
) {
  if (selectedIndex != null && rows.some(row => logIndex(row) === selectedIndex)) return selectedIndex;
  if (rovingIndex != null && rows.some(row => logIndex(row) === rovingIndex)) return rovingIndex;
  const firstRow = rows[0];
  return firstRow ? logIndex(firstRow) : undefined;
}

function setAttribute(element: HTMLElement, name: string, value: string | null) {
  if (value == null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
    return;
  }
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

export function decorateRow(
  row: HTMLElement,
  index: number,
  roving: boolean,
  selected: boolean,
  details: {
    controlsId: string;
    ariaLabel: string;
    severityLabel: string | undefined;
    serviceLabel?: string | undefined;
    showService?: boolean;
    showTime: boolean;
  }
) {
  setAttribute(row, 'role', 'row');
  setAttribute(row, 'tabindex', roving ? '0' : '-1');
  setAttribute(row, 'aria-label', details.ariaLabel);
  setAttribute(row, 'aria-selected', String(selected));
  setAttribute(row, 'aria-expanded', String(selected));
  setAttribute(row, 'aria-haspopup', 'dialog');
  setAttribute(row, 'aria-controls', selected ? details.controlsId : null);
  setAttribute(row, 'data-hertzbeat-log-trigger', 'true');
  setAttribute(row, 'data-hertzbeat-selected', selected ? 'true' : null);
  const content = row.firstElementChild;
  if (content instanceof HTMLElement) {
    setAttribute(content, 'data-hertzbeat-log-severity', details.severityLabel?.trim() || null);
    if (!content.matches(interactiveSelector)) {
      decorateSeverity(content, details.severityLabel);
      decorateService(content, details.serviceLabel, details.showService);
      decorateCells(content, details.showTime);
    }
  }
}

export function setRovingFocus(root: HTMLElement | null, selected: HTMLElement) {
  if (!root) return;
  for (const row of root.querySelectorAll<HTMLElement>('[data-log-index]')) row.tabIndex = row === selected ? 0 : -1;
}

export function formatVisibleTimestamp(time: HTMLTimeElement | null, timeZone?: string) {
  const fullTimestamp = time?.dateTime;
  if (!time || !fullTimestamp) return;
  const date = new Date(fullTimestamp);
  if (!Number.isFinite(date.getTime())) return;
  const visible = formatShortLocalTime(date.getTime(), { milliseconds: true, timeZone });
  setAttribute(time, 'title', fullTimestamp);
  setAttribute(time, 'aria-label', fullTimestamp);
  if (time.textContent !== visible) time.textContent = visible;
}

function decorateSeverity(content: HTMLElement, label: string | undefined) {
  let severity = content.querySelector<HTMLElement>('[data-hertzbeat-log-severity-text]');
  if (!severity) {
    severity = document.createElement('span');
    severity.dataset.hertzbeatLogSeverityText = 'true';
    const time = content.querySelector('time');
    if (time) time.after(severity);
    else content.prepend(severity);
  }
  const text = label?.trim() || '—';
  if (severity.textContent !== text) severity.textContent = text;
}

function decorateService(content: HTMLElement, label: string | undefined, show: boolean | undefined) {
  let service = content.querySelector<HTMLElement>('[data-hertzbeat-log-service]');
  setAttribute(content, 'data-hertzbeat-log-service-column', show ? 'true' : null);
  if (!show) {
    service?.remove();
    return;
  }
  if (!service) {
    service = document.createElement('span');
    service.dataset.hertzbeatLogService = 'true';
    content.querySelector('[data-hertzbeat-log-severity-text]')?.after(service);
  }
  const text = label?.trim() || '—';
  if (service.textContent !== text) service.textContent = text;
  setAttribute(service, 'title', text);
}

function decorateCells(content: HTMLElement, showTime: boolean) {
  setAttribute(content, 'role', 'presentation');
  let column = 1;
  for (const cell of content.children) {
    if (!(cell instanceof HTMLElement)) continue;
    const hidden = cell.tagName === 'TIME' && !showTime;
    setAttribute(cell, 'role', hidden ? null : 'gridcell');
    setAttribute(cell, 'aria-hidden', hidden ? 'true' : null);
    setAttribute(cell, 'aria-colindex', hidden ? null : String(column++));
  }
}

function keyboardMovement(key: string): -1 | 1 | 'first' | 'last' | undefined {
  if (key === 'ArrowUp') return -1;
  if (key === 'ArrowDown') return 1;
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  return undefined;
}

export function moveLogRowFocus(root: HTMLElement | null, target: HTMLElement, key: string) {
  const movement = keyboardMovement(key);
  if (movement == null) return undefined;
  const rows = Array.from(root?.querySelectorAll<HTMLElement>('[data-log-index]') ?? []);
  const current = rows.indexOf(target);
  const next = movement === 'first' ? 0 : movement === 'last' ? rows.length - 1 : current + movement;
  const row = rows[Math.max(0, Math.min(rows.length - 1, next))];
  if (!row) return undefined;
  setRovingFocus(root, row);
  row.focus();
  return logIndex(row);
}
