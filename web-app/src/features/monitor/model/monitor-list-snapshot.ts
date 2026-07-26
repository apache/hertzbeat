/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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

import type { Monitor, MonitorPage } from './monitor-contract';

export const monitorDisappearanceGraceMs = 5_000;

export type MonitorListRow = Monitor & {
  displayState?: 'active' | 'disappeared';
  disappearedAt?: number;
};

export type MonitorListSnapshot = Omit<MonitorPage, 'content'> & {
  content: MonitorListRow[];
};

export function resetMonitorListSnapshot(page: MonitorPage): MonitorListSnapshot {
  return { ...page, content: page.content.map(activeRow) };
}

export function reconcileAutomaticMonitorSnapshot(
  previous: MonitorListSnapshot,
  page: MonitorPage,
  now: number
): MonitorListSnapshot {
  const currentIds = new Set(page.content.map(monitor => monitor.id));
  const content = page.content.map(activeRow);
  previous.content.forEach(row => {
    if (currentIds.has(row.id)) return;
    if (row.displayState === 'disappeared') {
      if (!isExpired(row, now)) content.push(row);
      return;
    }
    content.push({ ...row, displayState: 'disappeared', disappearedAt: now });
  });
  return { ...page, content };
}

export function expireMonitorListSnapshot(snapshot: MonitorListSnapshot, now: number): MonitorListSnapshot {
  const content = snapshot.content.filter(row => !isExpired(row, now));
  return content.length === snapshot.content.length ? snapshot : { ...snapshot, content };
}

export function nextMonitorDisappearanceDeadline(snapshot: MonitorListSnapshot) {
  const deadlines = snapshot.content.flatMap(row =>
    row.displayState === 'disappeared' && row.disappearedAt !== undefined
      ? [row.disappearedAt + monitorDisappearanceGraceMs]
      : []
  );
  return deadlines.length ? Math.min(...deadlines) : null;
}

export function isMonitorRowDisappeared(row: MonitorListRow) {
  return row.displayState === 'disappeared';
}

function activeRow(monitor: Monitor): MonitorListRow {
  return { ...monitor, displayState: 'active' };
}

function isExpired(row: MonitorListRow, now: number) {
  return (
    row.displayState === 'disappeared' &&
    row.disappearedAt !== undefined &&
    now >= row.disappearedAt + monitorDisappearanceGraceMs
  );
}
