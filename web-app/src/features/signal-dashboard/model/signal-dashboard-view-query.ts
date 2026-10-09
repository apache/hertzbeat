/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import {
  buildSignalDashboardPath,
  canonicalSignalDashboardPath,
  signalDashboardPath
} from '@/shared/navigation/signal-dashboard-paths';
import { parseExactTimeWindow, type GlobalTimeRange } from '@/shared/time';
import type { ExactTimeWindow } from '@/shared/query-context';

export type DashboardVariables = Partial<Record<'serviceName' | 'serviceNamespace' | 'environment', string>>;
export type DashboardQueryControls = {
  duration: GlobalTimeRange;
  variables: DashboardVariables;
  presetSelected?: boolean;
};
const variableParams = {
  serviceName: 'varServiceName',
  serviceNamespace: 'varServiceNamespace',
  environment: 'varEnvironment'
} as const;

export function readDashboardViewQuery(params: URLSearchParams) {
  const variables: DashboardVariables = {};
  for (const [name, field] of Object.entries(variableParams)) {
    if (params.has(field)) variables[name as keyof DashboardVariables] = params.get(field)!;
  }
  return {
    key: params.get('dashboard') ?? undefined,
    valid: canonicalSignalDashboardPath(`${signalDashboardPath}?${params}`) !== undefined,
    hasExact: params.has('start') || params.has('end'),
    window: parseExactTimeWindow(params),
    duration: (params.get('duration') ?? undefined) as GlobalTimeRange | undefined,
    timeZone: params.get('timeZone') ?? undefined,
    variables
  };
}

export function buildDashboardViewPath(
  key: string | undefined,
  variables: DashboardVariables,
  timeZone: string,
  time: { window: ExactTimeWindow } | { duration: GlobalTimeRange }
): string {
  const path = buildSignalDashboardPath(key);
  const params = new URLSearchParams(path.split('?')[1]);
  params.set('timeZone', timeZone);
  if ('window' in time) {
    params.set('start', String(time.window.from));
    params.set('end', String(time.window.to));
  } else params.set('duration', time.duration);
  for (const [name, field] of Object.entries(variableParams)) {
    const value = variables[name as keyof DashboardVariables];
    if (value !== undefined) params.set(field, value);
  }
  const result = canonicalSignalDashboardPath(`${signalDashboardPath}?${params}`);
  if (!result) throw new Error('Invalid dashboard view');
  return result;
}

export function selectDashboardViewPath(params: URLSearchParams, key: string): string {
  const next = new URLSearchParams(params);
  const safeKey = new URLSearchParams(buildSignalDashboardPath(key).split('?')[1]).get('dashboard');
  if (!safeKey) throw new Error('Invalid dashboard key');
  next.set('dashboard', safeKey);
  const path = `${signalDashboardPath}?${next}`;
  return canonicalSignalDashboardPath(path) ?? path;
}
