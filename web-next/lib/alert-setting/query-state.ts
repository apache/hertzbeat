import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type AlertSettingSearchParams = SearchParamsRecord;

export type AlertSettingRouteState = {
  signal: string | null;
  signalContext: SignalRouteContext;
};

export type AlertSettingAppEntry = {
  key: string;
  value: string;
};

export function buildAlertSettingAppEntries(appMap: Record<string, unknown> | null | undefined): AlertSettingAppEntry[] {
  if (!appMap || Array.isArray(appMap) || typeof appMap !== 'object') return [];
  return Object.entries(appMap).flatMap(([key, value]) => (typeof value === 'string' ? [{ key, value }] : []));
}

export function buildAlertSettingSearchTerms(search: string, appEntries: AlertSettingAppEntry[] = []): string[] {
  const normalized = search.trim();
  if (!normalized) return [];
  const lowerSearch = normalized.toLowerCase();
  const translatedTerms = appEntries
    .filter(entry => entry.value.toLowerCase().includes(lowerSearch))
    .map(entry => entry.key);
  return translatedTerms.length > 0 ? translatedTerms : [normalized];
}

export function encodeDefineSearchTerms(terms: string[]): string | undefined {
  if (terms.length === 0) return undefined;
  return encodeURIComponent(JSON.stringify(terms));
}

export function normalizeDefineSearch(search: string, appEntries: AlertSettingAppEntry[] = []): string | undefined {
  return encodeDefineSearchTerms(buildAlertSettingSearchTerms(search, appEntries));
}

export function buildDefineListUrl(search: string, pageIndex = 0, pageSize = 8, appEntries: AlertSettingAppEntry[] = []): string {
  const params = new URLSearchParams({ pageIndex: String(pageIndex), pageSize: String(pageSize), sort: 'id', order: 'desc' });
  const payload = normalizeDefineSearch(search, appEntries);
  const baseQuery = params.toString();
  return payload ? `/alert/defines?${baseQuery}&search=${payload}` : `/alert/defines?${baseQuery}`;
}

export function readAlertSettingRouteState(searchParams: AlertSettingSearchParams = {}): AlertSettingRouteState {
  const reader = createCompatSearchParamReader(searchParams);

  return {
    signal: reader.get('signal'),
    signalContext: readSignalRouteContext(reader)
  };
}
