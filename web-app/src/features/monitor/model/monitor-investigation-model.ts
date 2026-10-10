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

import {
  buildInvestigationSignalHandoffPath,
  normalizeInvestigationTimeZone,
  type InvestigationTimeWindow,
  type QueryContext,
  type SignalKind
} from '@/shared/query-context';
import { buildEntityDetailPath } from '@/shared/navigation/app-paths';

import type { Monitor } from './monitor-contract';

export type MonitorSignalState = 'ready' | 'empty' | 'unavailable';

export type MonitorInvestigationIdentity = {
  monitorId: number;
  entityId: number;
  entityType: 'service';
  serviceName: string;
  serviceNamespace: string | null;
  environment: string | null;
  signals: readonly SignalKind[];
};

export type MonitorCollectionEvent = {
  observedAt: number;
  durationMillis: number;
  outcome: 'SUCCESS' | 'FAILURE';
  collectorId: string;
  target: string;
  metricSet: string;
  failureClass: 'NONE' | 'UNAVAILABLE' | 'UNREACHABLE' | 'UNCONNECTABLE' | 'COLLECTION' | 'TIMEOUT' | 'UNKNOWN';
  phase: 'UNKNOWN' | 'RESOLVE' | 'CONNECT' | 'AUTHENTICATE' | 'QUERY' | 'PARSE' | 'CONVERT' | 'DISPATCH';
  fieldCount: number;
  rowCount: number;
};

export type MonitorAlertPreview = {
  id: number;
  status: 'firing';
  severity: string | null;
  summary: string | null;
  activeAt: number | null;
};

export type MonitorInvestigationSnapshot = {
  monitorId: number;
  window: { start: number; end: number };
  collection:
    | { state: 'ready'; source: 'greptime_collection_events'; event: MonitorCollectionEvent }
    | { state: 'empty' | 'unavailable'; source: 'greptime_collection_events'; event: null };
  alerts:
    | {
        state: 'ready';
        source: 'current_alerts';
        scope: 'current';
        activeCount: number;
        previews: MonitorAlertPreview[];
      }
    | { state: 'empty'; source: 'current_alerts'; scope: 'current'; activeCount: 0; previews: MonitorAlertPreview[] }
    | {
        state: 'unavailable';
        source: 'current_alerts';
        scope: 'current';
        activeCount: null;
        previews: MonitorAlertPreview[];
      };
  binding:
    { state: 'ready'; identity: MonitorInvestigationIdentity } | { state: 'empty' | 'unavailable'; identity: null };
};

export type MonitorInvestigationViewState =
  | { kind: 'inactive' }
  | { kind: 'invalid_window' }
  | { kind: 'loading'; window: InvestigationTimeWindow }
  | { kind: 'unavailable' | 'error'; window: InvestigationTimeWindow }
  | { kind: 'ready'; window: InvestigationTimeWindow; snapshot: MonitorInvestigationSnapshot };

export type MonitorInvestigation = {
  context: QueryContext & { entityId: string; monitorId: string; serviceName: string };
  window: InvestigationTimeWindow;
  signals: SignalKind[];
};

const signalOrder: SignalKind[] = ['metrics', 'logs', 'traces'];
const historyDuration = {
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
  '4W': 28 * 24 * 60 * 60_000,
  '12W': 84 * 24 * 60 * 60_000
} as const;

export function createMonitorInvestigation(
  monitor: Monitor,
  binding: MonitorInvestigationIdentity,
  window: InvestigationTimeWindow
): MonitorInvestigation {
  requireBinding(monitor, binding);
  const timeZone = normalizeInvestigationTimeZone(window.timeZone);
  if (!validWindow(window) || !timeZone) throw new Error('Monitor investigation time evidence is invalid');
  const signals = canonicalSignals(binding.signals);
  return {
    context: {
      entityId: String(binding.entityId),
      monitorId: String(monitor.id),
      serviceName: binding.serviceName.trim(),
      ...(hasContent(binding.serviceNamespace) ? { serviceNamespace: binding.serviceNamespace.trim() } : {}),
      ...(hasContent(binding.environment) ? { environment: binding.environment.trim() } : {}),
      instance: monitor.instance.trim()
    },
    window: { from: window.from, to: window.to, timeZone },
    signals
  };
}

export function buildMonitorInvestigationSignalPath(investigation: MonitorInvestigation, signal: SignalKind) {
  if (!investigation.signals.includes(signal)) return undefined;
  return buildInvestigationSignalHandoffPath(signal, investigation.context, investigation.window);
}

export function buildMonitorInvestigationEntityPath(entityId: number, window: InvestigationTimeWindow) {
  const timeZone = normalizeInvestigationTimeZone(window.timeZone);
  if (!Number.isSafeInteger(entityId) || entityId <= 0 || !validWindow(window) || !timeZone) {
    throw new Error('Monitor investigation Entity handoff evidence is invalid');
  }
  const params = new URLSearchParams({
    start: String(window.from),
    end: String(window.to),
    timeZone
  });
  return `${buildEntityDetailPath(entityId)}?${params.toString()}`;
}

export function monitorInvestigationWindow(
  history: keyof typeof historyDuration,
  to: number,
  timeZone: string
): InvestigationTimeWindow {
  const from = to - Math.min(historyDuration[history], historyDuration['24h']);
  const normalizedTimeZone = normalizeInvestigationTimeZone(timeZone);
  if (!Number.isSafeInteger(to) || to <= 0 || !Number.isSafeInteger(from) || from <= 0 || !normalizedTimeZone) {
    throw new Error('Monitor investigation time evidence is invalid');
  }
  return { from, to, timeZone: normalizedTimeZone };
}

function requireBinding(monitor: Monitor, binding: MonitorInvestigationIdentity) {
  if (
    !Number.isSafeInteger(monitor.id) ||
    monitor.id <= 0 ||
    binding.monitorId !== monitor.id ||
    !Number.isSafeInteger(binding.entityId) ||
    binding.entityId <= 0 ||
    binding.entityType !== 'service' ||
    !hasContent(binding.serviceName) ||
    !hasContent(monitor.instance)
  ) {
    throw new Error('Monitor investigation identity evidence is invalid');
  }
}

function canonicalSignals(signals: readonly SignalKind[]) {
  const available = new Set(signals);
  if (available.size !== signals.length || signals.some(signal => !signalOrder.includes(signal))) {
    throw new Error('Monitor investigation signal evidence is invalid');
  }
  return signalOrder.filter(signal => available.has(signal));
}

function validWindow(window: InvestigationTimeWindow) {
  return (
    Number.isSafeInteger(window.from) && Number.isSafeInteger(window.to) && window.from > 0 && window.from < window.to
  );
}

function hasContent(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}
