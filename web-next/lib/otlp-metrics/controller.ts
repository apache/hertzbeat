import { readEntityIdRouteParam, readEpochMillisRouteParam, stripReturnLabelFromHref, type SignalRouteContext } from '../signal-route-context';
import { normalizeTimeContextValue } from '../time-context';
import type { OtlpMetricsConsole, OtlpMetricsInventory } from '@/lib/types';

type ApiGetter = <T>(url: string) => Promise<T>;

export type OtlpMetricsInspectorView = 'graph' | 'table';
export type OtlpMetricsExpectedRangeDisplay = 'on';
export type OtlpMetricsInventorySort = 'name' | 'latest' | 'samples' | 'time-series';
export const OTLP_METRICS_INVENTORY_PAGE_SIZE_OPTIONS = ['5', '10', '20', '50'] as const;

export type OtlpMetricsQueryState = SignalRouteContext & {
  query?: string;
  series?: string;
  filter?: string;
  aggregation?: string;
  temporalAggregation?: string;
  groupBy?: string;
  legendFormat?: string;
  formula?: string;
  step?: string;
  limit?: string;
  traceId?: string;
  spanId?: string;
  inspector?: OtlpMetricsInspectorView;
  warningThreshold?: string;
  criticalThreshold?: string;
  expectedRange?: OtlpMetricsExpectedRangeDisplay;
  inventorySearch?: string;
  inventorySort?: OtlpMetricsInventorySort;
  inventoryPageSize?: string;
  inventoryPageIndex?: string;
  seriesAttributeSearch?: string;
  relatedMetricSource?: string;
  relatedMetricFamily?: string;
  relatedMetricReason?: string;
  relatedMetricMatchedLabels?: string;
  relatedMetricResourceMatch?: string;
};

export type SearchParamReader = {
  get: (key: string) => string | null;
};

function readPositiveIntegerRouteParam(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed) > 0 ? trimmed : undefined;
}

function readFiniteNumberRouteParam(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? trimmed : undefined;
}

function readMetricsInspectorView(value: string | null | undefined): OtlpMetricsInspectorView {
  return value === 'table' ? 'table' : 'graph';
}

function readMetricSeriesRouteParam(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function readExpectedRangeDisplay(value: string | null | undefined): OtlpMetricsExpectedRangeDisplay | undefined {
  return value === 'on' ? 'on' : undefined;
}

function readMetricsInventorySort(value: string | null | undefined): OtlpMetricsInventorySort | undefined {
  return value === 'latest' || value === 'samples' || value === 'time-series' ? value : undefined;
}

function readMetricsInventoryPageSize(value: string | null | undefined) {
  const trimmed = readPositiveIntegerRouteParam(value);
  return OTLP_METRICS_INVENTORY_PAGE_SIZE_OPTIONS.find(option => option === trimmed);
}

export function queryStateFromParams(params: SearchParamReader): OtlpMetricsQueryState {
  return {
    query: params.get('query') || undefined,
    series: readMetricSeriesRouteParam(params.get('series')),
    filter: params.get('filter') || undefined,
    aggregation: params.get('aggregation') || undefined,
    temporalAggregation: params.get('temporalAggregation') || undefined,
    groupBy: params.get('groupBy') || undefined,
    legendFormat: params.get('legendFormat') || undefined,
    formula: params.get('formula') || undefined,
    step: readPositiveIntegerRouteParam(params.get('step')),
    limit: readPositiveIntegerRouteParam(params.get('limit')),
    timeRange: params.get('timeRange') || undefined,
    source: params.get('source') || undefined,
    collector: params.get('collector') || undefined,
    template: params.get('template') || undefined,
    entityId: readEntityIdRouteParam(params.get('entityId')),
    entityType: params.get('entityType') || undefined,
    entityName: params.get('entityName') || undefined,
    returnTo: stripReturnLabelFromHref(params.get('returnTo')) || undefined,
    traceId: params.get('traceId') || undefined,
    spanId: params.get('spanId') || undefined,
    operationName: params.get('operationName') || undefined,
    inspector: readMetricsInspectorView(params.get('inspector')),
    warningThreshold: readFiniteNumberRouteParam(params.get('warningThreshold')),
    criticalThreshold: readFiniteNumberRouteParam(params.get('criticalThreshold')),
    expectedRange: readExpectedRangeDisplay(params.get('expectedRange')),
    inventorySearch: params.get('inventorySearch') || undefined,
    inventorySort: readMetricsInventorySort(params.get('inventorySort')),
    inventoryPageSize: readMetricsInventoryPageSize(params.get('inventoryPageSize')),
    inventoryPageIndex: params.get('inventoryPageIndex') === '0' ? undefined : readPositiveIntegerRouteParam(params.get('inventoryPageIndex')),
    seriesAttributeSearch: params.get('seriesAttributeSearch') || undefined,
    relatedMetricSource: params.get('relatedMetricSource') || undefined,
    relatedMetricFamily: params.get('relatedMetricFamily') || undefined,
    relatedMetricReason: params.get('relatedMetricReason') || undefined,
    relatedMetricMatchedLabels: params.get('relatedMetricMatchedLabels') || undefined,
    relatedMetricResourceMatch: params.get('relatedMetricResourceMatch') || undefined,
    serviceName: params.get('serviceName') || undefined,
    serviceNamespace: params.get('serviceNamespace') || undefined,
    environment: params.get('environment') || undefined,
    from: normalizeTimeContextValue('from', params.get('from')),
    to: normalizeTimeContextValue('to', params.get('to')),
    start: normalizeTimeContextValue('start', params.get('start')),
    end: normalizeTimeContextValue('end', params.get('end')),
    refresh: normalizeTimeContextValue('refresh', params.get('refresh')),
    live: normalizeTimeContextValue('live', params.get('live')),
    tz: normalizeTimeContextValue('tz', params.get('tz')),
    timezone: normalizeTimeContextValue('timezone', params.get('timezone')),
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
      if (key === 'inspector') return;
      if (key === 'series') return;
      if (key === 'legendFormat') return;
      if (key === 'formula') return;
      if (key === 'inventorySearch' || key === 'inventorySort' || key === 'inventoryPageSize' || key === 'inventoryPageIndex') return;
      if (key === 'seriesAttributeSearch') return;
      if (key === 'relatedMetricSource' || key === 'relatedMetricFamily' || key === 'relatedMetricReason' || key === 'relatedMetricMatchedLabels' || key === 'relatedMetricResourceMatch') return;
      if (key === 'warningThreshold' || key === 'criticalThreshold') return;
      if (key === 'expectedRange') return;
      if (key === 'entityId') {
        const entityId = readEntityIdRouteParam(String(value));
        if (entityId) params.set(key, entityId);
        return;
      }
      if (key === 'timeRange' || key === 'from' || key === 'to' || key === 'start' || key === 'end' || key === 'refresh' || key === 'live' || key === 'tz' || key === 'timezone') {
        const timeValue = normalizeTimeContextValue(key, String(value));
        if (timeValue) params.set(key, timeValue);
        return;
      }
      if (key === 'returnTo') {
        const returnTo = stripReturnLabelFromHref(String(value));
        if (returnTo) params.set(key, returnTo);
        return;
      }
      if (key === 'step' || key === 'limit') {
        const positiveInteger = readPositiveIntegerRouteParam(String(value));
        if (positiveInteger) params.set(key, positiveInteger);
        return;
      }
      params.set(key, String(value));
    }
  });
  return params.size > 0 ? `/ingestion/otlp/metrics/console?${params.toString()}` : '/ingestion/otlp/metrics/console';
}

export function buildOtlpMetricsInventoryUrl(query: OtlpMetricsQueryState = {}) {
  const params = new URLSearchParams();
  const contextKeys = [
    'entityId',
    'entityType',
    'serviceName',
    'serviceNamespace',
    'environment',
    'start',
    'end',
    'limit'
  ] as const;
  contextKeys.forEach(key => {
    const value = query[key];
    if (value == null || String(value).trim() === '') {
      return;
    }
    if (key === 'entityId') {
      const entityId = readEntityIdRouteParam(String(value));
      if (entityId) params.set(key, entityId);
      return;
    }
    if (key === 'start' || key === 'end') {
      const timeValue = normalizeTimeContextValue(key, String(value));
      if (timeValue) params.set(key, timeValue);
      return;
    }
    if (key === 'limit') {
      const positiveInteger = readPositiveIntegerRouteParam(String(value));
      if (positiveInteger) params.set(key, positiveInteger);
      return;
    }
    params.set(key, String(value));
  });
  return params.size > 0 ? `/ingestion/otlp/metrics/inventory?${params.toString()}` : '/ingestion/otlp/metrics/inventory';
}

export async function loadOtlpMetricsConsole(apiGet: ApiGetter, query: OtlpMetricsQueryState = {}) {
  return apiGet<OtlpMetricsConsole>(buildOtlpMetricsConsoleUrl(query));
}

export async function loadOtlpMetricsInventory(apiGet: ApiGetter, query: OtlpMetricsQueryState = {}) {
  return apiGet<OtlpMetricsInventory>(buildOtlpMetricsInventoryUrl(query));
}
