/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  buildInvestigationSignalHandoffPath,
  normalizeInvestigationTimeZone,
  type InvestigationTimeWindow,
  type QueryContext,
  type SignalKind
} from '@/shared/query-context';

import type { Monitor } from './monitor-contract';
import type { MonitorMetricHistory } from './monitor-detail-model';

export type MonitorInvestigationBinding = {
  monitorId: number;
  entityId: number;
  entityType: 'service';
  serviceName: string;
  serviceNamespace?: string | undefined;
  environment?: string | undefined;
  signals: readonly SignalKind[];
};

export type MonitorInvestigation = {
  context: QueryContext & { entityId: string; monitorId: string; serviceName: string };
  window: InvestigationTimeWindow;
  signals: SignalKind[];
};

const signalOrder: SignalKind[] = ['metrics', 'logs', 'traces'];
const historyDuration: Record<MonitorMetricHistory, number> = {
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
  '4W': 28 * 24 * 60 * 60_000,
  '12W': 84 * 24 * 60 * 60_000
};

export function createMonitorInvestigation(
  monitor: Monitor,
  binding: MonitorInvestigationBinding,
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
      ...(hasContent(binding.serviceNamespace) ? { serviceNamespace: binding.serviceNamespace!.trim() } : {}),
      ...(hasContent(binding.environment) ? { environment: binding.environment!.trim() } : {}),
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

export function monitorInvestigationWindow(
  history: MonitorMetricHistory,
  to: number,
  timeZone: string
): InvestigationTimeWindow {
  const from = to - historyDuration[history];
  const normalizedTimeZone = normalizeInvestigationTimeZone(timeZone);
  if (!Number.isSafeInteger(to) || to <= 0 || !Number.isSafeInteger(from) || from <= 0 || !normalizedTimeZone) {
    throw new Error('Monitor investigation time evidence is invalid');
  }
  return { from, to, timeZone: normalizedTimeZone };
}

function requireBinding(monitor: Monitor, binding: MonitorInvestigationBinding) {
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

function hasContent(value: string | undefined) {
  return Boolean(value?.trim());
}
