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

import type { TFunction } from 'i18next';

export function formatAgentTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(timestamp);
}

export function toolStatusColor(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'UNKNOWN' || normalized === 'CANCELLED') return 'default';
  if (normalized === 'SUCCEEDED' || normalized === 'COMPLETED') return 'success';
  if (normalized === 'FAILED' || normalized === 'DENIED') return 'error';
  if (normalized.includes('WAITING')) return 'warning';
  return 'processing';
}

export function formatElapsed(elapsedMs: number) {
  return elapsedMs < 1000 ? `${elapsedMs} ms` : `${(elapsedMs / 1000).toFixed(1)} s`;
}

export function sessionStatusLabel(status: string, t: TFunction) {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'RUNNING') return t('aiWorkspace.sessions.status.active');
  if (normalized === 'COMPLETED' || normalized === 'SUCCEEDED') return t('aiWorkspace.sessions.status.completed');
  if (normalized === 'PARTIAL') return t('aiWorkspace.sessions.status.partial');
  if (normalized === 'FAILED') return t('aiWorkspace.sessions.status.failed');
  if (normalized === 'CANCELLED') return t('aiWorkspace.sessions.status.cancelled');
  if (normalized === 'RECOVERY_REQUIRED') return t('aiWorkspace.sessions.status.recoveryRequired');
  if (normalized === 'NO_RUN') return t('aiWorkspace.sessions.status.noRun');
  return status;
}

export function formatAgentScopeWindow(start: number, end: number, timeZone = 'UTC') {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    timeZone
  };
  try {
    const formatter = new Intl.DateTimeFormat(undefined, options);
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  } catch {
    return '—';
  }
}

export function toolStatusLabel(status: string, t: TFunction) {
  if (status === 'UNKNOWN') return t('aiWorkspace.context.statusUnknown');
  if (status === 'CANCELLED') return t('aiWorkspace.context.cancelledBeforeExecution');
  return status;
}
