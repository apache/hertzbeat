import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { queryStateFromParams, type AlertQueryState } from '../alert-manage/query-state';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type AlertSilenceSearchParams = SearchParamsRecord;

export type AlertSilenceManagementContext = {
  entityId: string;
  entityName: string;
  returnTo: string;
  returnLabel: string;
  matchMode: string;
  matchingRuleType: 'silence' | 'inhibit' | '';
  matchingRuleIds: number[];
  matchedViewEnabled: boolean;
};

export type AlertSilenceRouteState = {
  returnContext: AlertQueryState;
  signal: string | null;
  signalContext: SignalRouteContext;
  managementContext: AlertSilenceManagementContext;
};

export type AlertSilenceListQuery = {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
};

export const ALERT_SILENCE_PAGE_SIZE_OPTIONS = [8, 15, 25] as const;

function normalizePageIndex(value: number | null | undefined) {
  return Number.isFinite(value) && value != null && value >= 0 ? Math.floor(value) : 0;
}

function normalizePageSize(value: number | null | undefined) {
  if (ALERT_SILENCE_PAGE_SIZE_OPTIONS.includes(value as (typeof ALERT_SILENCE_PAGE_SIZE_OPTIONS)[number])) {
    return value as (typeof ALERT_SILENCE_PAGE_SIZE_OPTIONS)[number];
  }
  return ALERT_SILENCE_PAGE_SIZE_OPTIONS[0];
}

function readSilenceParam(searchParams: ReturnType<typeof createCompatSearchParamReader>, key: string): string {
  return (searchParams.get(key) || '').trim();
}

function parseMatchingRuleIds(value: string | null): number[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map(item => Number.parseInt(item.trim(), 10))
        .filter(id => Number.isFinite(id) && id > 0)
    )
  );
}

function readManagementContext(searchParams: ReturnType<typeof createCompatSearchParamReader>): AlertSilenceManagementContext {
  const matchMode = readSilenceParam(searchParams, 'matchMode');
  const matchingRuleTypeParam = readSilenceParam(searchParams, 'matchingRuleType');
  const matchingRuleType = matchingRuleTypeParam === 'silence' || matchingRuleTypeParam === 'inhibit' ? matchingRuleTypeParam : '';

  return {
    entityId: readSilenceParam(searchParams, 'entityId'),
    entityName: readSilenceParam(searchParams, 'entityName'),
    returnTo: readSilenceParam(searchParams, 'returnTo'),
    returnLabel: readSilenceParam(searchParams, 'returnLabel'),
    matchMode,
    matchingRuleType,
    matchingRuleIds: parseMatchingRuleIds(searchParams.get('matchingRuleIds')),
    matchedViewEnabled: matchMode === 'entity-noise-controls'
  };
}

export function readAlertSilenceRouteState(searchParams: AlertSilenceSearchParams = {}): AlertSilenceRouteState {
  const reader = createCompatSearchParamReader(searchParams);

  return {
    returnContext: queryStateFromParams(reader),
    signal: reader.get('signal'),
    signalContext: readSignalRouteContext(reader),
    managementContext: readManagementContext(reader)
  };
}

export function buildAlertSilenceUrl(query: string | AlertSilenceListQuery): string {
  const normalizedQuery = typeof query === 'string' ? { search: query } : query;
  const params = new URLSearchParams({
    pageIndex: String(normalizePageIndex(normalizedQuery.pageIndex)),
    pageSize: String(normalizePageSize(normalizedQuery.pageSize)),
    sort: 'id',
    order: 'desc'
  });
  if (normalizedQuery.search?.trim()) params.set('search', normalizedQuery.search.trim());
  return `/alert/silences?${params.toString()}`;
}
