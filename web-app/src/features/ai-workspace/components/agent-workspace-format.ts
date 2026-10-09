/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { TFunction } from 'i18next';

export function formatAgentTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}

export function toolStatusColor(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'UNKNOWN') return 'default';
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
  if (normalized === 'FAILED') return t('aiWorkspace.sessions.status.failed');
  if (normalized === 'CANCELLED') return t('aiWorkspace.sessions.status.cancelled');
  if (normalized === 'RECOVERY_REQUIRED') return t('aiWorkspace.sessions.status.recoveryRequired');
  if (normalized === 'NO_RUN') return t('aiWorkspace.sessions.status.noRun');
  return status;
}
