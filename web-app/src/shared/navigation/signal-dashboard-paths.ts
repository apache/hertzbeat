/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { normalizeInvestigationTimeZone, type ExactTimeWindow } from '@/shared/query-context';
import { applicationRoutePaths } from './app-paths';

export const signalDashboardPath = '/observability/dashboards';

export type DashboardPanelHandoff = {
  version: 1;
  document: unknown;
  timeWindow: ExactTimeWindow;
  returnTo: string;
};

const keyPattern = /^[A-Za-z0-9_.:-]{1,128}$/u;
const variableFields = ['varServiceName', 'varServiceNamespace', 'varEnvironment'] as const;
const routeFields = new Set(['dashboard', 'start', 'end', 'timeZone', 'duration', ...variableFields]);
const durations = new Set(['15m', '30m', '1h', '6h', '24h']);

export function buildSignalDashboardPath(key?: string) {
  if (key === undefined) return signalDashboardPath;
  if (!keyPattern.test(key)) throw new Error('Invalid dashboard key');
  return `${signalDashboardPath}?${new URLSearchParams({ dashboard: key })}`;
}

/** A Dashboard return target carries only known, bounded view state, never an authoring draft. */
export function canonicalSignalDashboardPath(value: string | null | undefined): string | undefined {
  if (value === signalDashboardPath) return value;
  const prefix = `${signalDashboardPath}?`;
  if (!value?.startsWith(prefix) || value.length > 8192 || /[#\\\r\n]|%(?![0-9a-f]{2})/iu.test(value)) return undefined;
  const params = new URLSearchParams(value.slice(prefix.length));
  if (!validDashboardParameters(params)) return undefined;
  if (!variableFields.every(field => validVariableOverride(params.get(field)))) return undefined;
  return params.size ? `${signalDashboardPath}?${params}` : signalDashboardPath;
}

function validDashboardParameters(params: URLSearchParams) {
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some(key => !routeFields.has(key))) return false;
  const key = params.get('dashboard');
  if (key !== null && !keyPattern.test(key)) return false;
  const duration = params.get('duration');
  if (duration !== null && !durations.has(duration)) return false;
  const zone = params.get('timeZone');
  if (zone !== null && normalizeInvestigationTimeZone(zone) !== zone) return false;
  return !(params.has('start') || params.has('end')) || (duration === null && validExactWindow(params));
}

function validVariableOverride(value: string | null) {
  if (value === null) return true;
  return (
    value.length <= 256 &&
    value.trim() === value &&
    !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) &&
    !value.includes('${') &&
    !value.includes('$__')
  );
}

/** Navigation safety and a fixed investigation window; Explore retains ownership of query validation. */
export function safeDashboardExploreReturnPath(value: string | null | undefined): string | undefined {
  const prefix = `${applicationRoutePaths.explore}?`;
  if (!value?.startsWith(prefix) || value.length > 8192 || /[#\\\r\n]|%(?![0-9a-f]{2})/iu.test(value)) return undefined;
  const params = new URLSearchParams(value.slice(prefix.length));
  if (
    new Set(params.keys()).size !== [...params].length ||
    !['metrics', 'logs', 'traces'].includes(params.get('signal') ?? '') ||
    !validExactWindow(params)
  )
    return undefined;
  return `${prefix}${params}`;
}

function validExactWindow(params: URLSearchParams) {
  const zone = params.get('timeZone');
  if (!zone || normalizeInvestigationTimeZone(zone) !== zone) return false;
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  if (!/^[1-9]\d*$/u.test(start) || !/^[1-9]\d*$/u.test(end)) return false;
  const from = Number(start);
  const to = Number(end);
  return Number.isSafeInteger(from) && Number.isSafeInteger(to) && from < to && to - from <= 86_400_000;
}
