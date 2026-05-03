import { readEntityIdRouteParam, readEpochMillisRouteParam, stripReturnLabelFromHref, type SignalRouteContext } from '../signal-route-context';
import { normalizeTimeContextValue } from '../time-context';
import type { OtlpMetricsConsole } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

export type OtlpMetricsQueryState = SignalRouteContext & {
  query?: string;
  aggregation?: string;
  groupBy?: string;
  traceId?: string;
  spanId?: string;
};

export type SearchParamReader = {
  get: (key: string) => string | null;
};

export function queryStateFromParams(params: SearchParamReader): OtlpMetricsQueryState {
  return {
    query: params.get('query') || undefined,
    aggregation: params.get('aggregation') || undefined,
    groupBy: params.get('groupBy') || undefined,
    timeRange: params.get('timeRange') || undefined,
    source: params.get('source') || undefined,
    collector: params.get('collector') || undefined,
    template: params.get('template') || undefined,
    entityId: readEntityIdRouteParam(params.get('entityId')),
    entityName: params.get('entityName') || undefined,
    returnTo: stripReturnLabelFromHref(params.get('returnTo')) || undefined,
    traceId: params.get('traceId') || undefined,
    spanId: params.get('spanId') || undefined,
    serviceName: params.get('serviceName') || undefined,
    serviceNamespace: params.get('serviceNamespace') || undefined,
    environment: params.get('environment') || undefined,
    start: normalizeTimeContextValue('start', params.get('start')),
    end: normalizeTimeContextValue('end', params.get('end')),
    refresh: normalizeTimeContextValue('refresh', params.get('refresh')),
    live: normalizeTimeContextValue('live', params.get('live')),
    tz: normalizeTimeContextValue('tz', params.get('tz')),
    codeRepo: params.get('codeRepo') || undefined,
    codeProvider: params.get('codeProvider') || undefined,
    codePath: params.get('codePath') || undefined,
    codeSearch: params.get('codeSearch') || undefined,
    codeLabel: params.get('codeLabel') || undefined
  };
}

export function buildOtlpMetricsConsoleUrl(query: OtlpMetricsQueryState) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      if (key === 'returnLabel') return;
      if (key === 'entityId') {
        const entityId = readEntityIdRouteParam(String(value));
        if (entityId) params.set(key, entityId);
        return;
      }
      if (key === 'timeRange' || key === 'start' || key === 'end' || key === 'refresh' || key === 'live' || key === 'tz') {
        const timeValue = normalizeTimeContextValue(key, String(value));
        if (timeValue) params.set(key, timeValue);
        return;
      }
      if (key === 'returnTo') {
        const returnTo = stripReturnLabelFromHref(String(value));
        if (returnTo) params.set(key, returnTo);
        return;
      }
      params.set(key, String(value));
    }
  });
  return params.size > 0 ? `/ingestion/otlp/metrics/console?${params.toString()}` : '/ingestion/otlp/metrics/console';
}

export async function loadOtlpMetricsConsole(apiGet: ApiGetter, query: OtlpMetricsQueryState = {}) {
  return apiGet<OtlpMetricsConsole>(buildOtlpMetricsConsoleUrl(query));
}
