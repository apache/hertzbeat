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

import { buildExplorePath } from '@/features/explore';

import type { AlertRecord } from './alert-model';

const alertTelemetrySignals = ['metrics', 'logs', 'traces'] as const;
const alertWindowPaddingMs = 15 * 60_000;
const maximumScopeLength = 512;
const maximumJavaScriptTimestamp = 8_640_000_000_000_000;

const scopeLabelKeys = {
  serviceName: 'service.name',
  serviceNamespace: 'service.namespace',
  environment: 'deployment.environment.name'
} as const;

export type AlertTelemetryHandoff = {
  signal: (typeof alertTelemetrySignals)[number];
  path: string;
};

export function alertTelemetryHandoffs(alert: AlertRecord): AlertTelemetryHandoff[] {
  const scope = exactTelemetryScope(alert.labels);
  if (!scope) return [];
  const window = exactAlertWindow(alert);
  if (!window) return [];
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

function exactLabelValue(labels: Record<string, string>, key: string) {
  const value = labels[key];
  return value === undefined ? undefined : boundedScopeValue(value);
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
  const anchor = alert.activeAt ?? alert.startAt;
  if (!validTimestamp(anchor)) return null;
  const start = Math.max(1, anchor - alertWindowPaddingMs);
  const end = Math.min(maximumJavaScriptTimestamp, anchor + alertWindowPaddingMs);
  return start < end ? { start, end } : null;
}

function validTimestamp(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0 && value <= maximumJavaScriptTimestamp;
}
