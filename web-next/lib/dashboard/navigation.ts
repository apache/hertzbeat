import { buildOverviewCompatRouteUrl, type SearchParamsRecord } from '../overview/navigation';
import {
  applySignalDashboardTimeRange,
  normalizeSignalDashboardTimeRange,
  normalizeSignalDashboardKey,
  normalizeSignalDashboardVariableName,
  type SignalDashboardTimeRange,
  type SignalDashboardVariable
} from '../signal-dashboards';

export type { SearchParamsRecord };

const DASHBOARD_VARIABLE_PARAM_PREFIX = 'var-';

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function buildDashboardCompatRouteUrl(searchParams?: SearchParamsRecord) {
  return buildOverviewCompatRouteUrl(searchParams);
}

export function buildDashboardDeepLinkHref(currentHref: string | undefined, dashboardKey: string) {
  const normalizedDashboardKey = normalizeSignalDashboardKey(dashboardKey);
  try {
    const url = new URL(currentHref || '/dashboard', 'http://hertzbeat.local');
    url.searchParams.set('dashboard', normalizedDashboardKey);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return `/dashboard?dashboard=${encodeURIComponent(normalizedDashboardKey)}`;
  }
}

export function dashboardVariableParamName(variableName: string) {
  const normalizedName = normalizeSignalDashboardVariableName(variableName);
  return normalizedName ? `${DASHBOARD_VARIABLE_PARAM_PREFIX}${normalizedName}` : '';
}

export function readDashboardVariableUrlOverrides(searchParams?: SearchParamsRecord) {
  return Object.entries(searchParams || {}).reduce<Record<string, string>>((overrides, [key, value]) => {
    if (!key.startsWith(DASHBOARD_VARIABLE_PARAM_PREFIX)) return overrides;
    const variableName = normalizeSignalDashboardVariableName(key.slice(DASHBOARD_VARIABLE_PARAM_PREFIX.length));
    const variableValue = firstParamValue(value)?.trim().slice(0, 512) || '';
    if (variableName) {
      overrides[variableName] = variableValue;
    }
    return overrides;
  }, {});
}

export function buildDashboardVariableDeepLinkHref(currentHref: string | undefined, variableName: string, value: string) {
  const paramName = dashboardVariableParamName(variableName);
  if (!paramName) return currentHref || '/dashboard';
  try {
    const url = new URL(currentHref || '/dashboard', 'http://hertzbeat.local');
    const normalizedValue = value.trim().slice(0, 512);
    if (normalizedValue) {
      url.searchParams.set(paramName, normalizedValue);
    } else {
      url.searchParams.delete(paramName);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const normalizedValue = value.trim().slice(0, 512);
    return normalizedValue ? `/dashboard?${paramName}=${encodeURIComponent(normalizedValue)}` : '/dashboard';
  }
}

export function buildDashboardReturnHref(input: {
  currentHref?: string;
  dashboardKey: string;
  timeRange?: SignalDashboardTimeRange;
  variables?: SignalDashboardVariable[];
}) {
  const dashboardHref = buildDashboardDeepLinkHref(input.currentHref || '/dashboard', input.dashboardKey);
  const variableHref = (input.variables || []).reduce((href, variable) => {
    return buildDashboardVariableDeepLinkHref(href, variable.name, variable.value || '');
  }, dashboardHref);
  return applySignalDashboardTimeRange(variableHref, input.timeRange);
}

export function buildDashboardTimeRangeDeepLinkHref(currentHref: string | undefined, timeRange: SignalDashboardTimeRange | undefined) {
  const source = currentHref || '/dashboard';
  const normalized = normalizeSignalDashboardTimeRange(timeRange);
  if (normalized.start || normalized.end || normalized.timeRange || normalized.refresh || normalized.live) {
    return applySignalDashboardTimeRange(source, normalized);
  }
  try {
    const url = new URL(source, 'http://hertzbeat.local');
    ['start', 'end', 'from', 'to', 'timeRange', 'refresh', 'live'].forEach(key => url.searchParams.delete(key));
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}
