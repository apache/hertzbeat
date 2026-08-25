/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { buildExplorePath } from '@/features/explore';

import type { AlertRecord } from './alert-model';

const alertTelemetrySignals = ['metrics', 'logs', 'traces'] as const;
const alertWindowPaddingMs = 15 * 60_000;
const maximumScopeLength = 512;
const maximumJavaScriptTimestamp = 8_640_000_000_000_000;

const scopeLabelKeys = {
  serviceName: ['service.name', 'service', 'serviceName', 'job', 'instance'],
  serviceNamespace: ['service.namespace', 'serviceNamespace', 'service_namespace'],
  environment: ['deployment.environment.name', 'environment', 'deployment.environment']
} as const;

export type AlertTelemetryHandoff = {
  signal: (typeof alertTelemetrySignals)[number];
  path: string;
};

export function alertTelemetryHandoffs(alert: AlertRecord): AlertTelemetryHandoff[] {
  const scope = exactTelemetryScope(alert.labels);
  if (!scope) return [];
  const window = exactAlertWindow(alert);
  return alertTelemetrySignals.map(signal => ({
    signal,
    path: buildExplorePath({ signal, timeRange: 'last-30m', ...scope, ...window })
  }));
}

function exactTelemetryScope(labels: AlertRecord['labels']) {
  if (!labels) return null;
  const serviceName = exactLabelValue(labels, scopeLabelKeys.serviceName);
  const serviceNamespace = exactLabelValue(labels, scopeLabelKeys.serviceNamespace);
  const environment = exactLabelValue(labels, scopeLabelKeys.environment);
  if (!serviceName || serviceNamespace === null || environment === null) return null;
  return {
    serviceName,
    ...(serviceNamespace ? { serviceNamespace } : {}),
    ...(environment ? { environment } : {})
  };
}

function exactLabelValue(labels: Record<string, string>, keys: readonly string[]): string | null | undefined {
  const canonical = labels[keys[0] ?? ''];
  if (canonical !== undefined && canonical.trim() !== '') return boundedScopeValue(canonical);
  const values: string[] = [];
  for (const key of keys.slice(1)) {
    const raw = labels[key];
    if (raw === undefined || raw.trim() === '') continue;
    const value = boundedScopeValue(raw);
    if (!value) return null;
    values.push(value);
  }
  const unique = [...new Set(values)];
  if (unique.length > 1) return null;
  return unique[0];
}

function boundedScopeValue(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumScopeLength || hasControlCharacter(normalized)) {
    return null;
  }
  return normalized;
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function exactAlertWindow(alert: Pick<AlertRecord, 'startAt' | 'activeAt' | 'endAt'>) {
  const first = alert.startAt ?? alert.activeAt;
  const last = alert.endAt ?? alert.activeAt ?? alert.startAt;
  if (!validTimestamp(first) || !validTimestamp(last)) return {};
  const start = Math.max(1, first - alertWindowPaddingMs);
  const end = Math.min(maximumJavaScriptTimestamp, last + alertWindowPaddingMs);
  return start < end ? { start, end } : {};
}

function validTimestamp(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0 && value <= maximumJavaScriptTimestamp;
}
