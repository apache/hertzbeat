import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';

export type SettingDefineSearchParams = SearchParamsRecord;

export type SettingDefineRouteState = {
  app: string | null;
};

function normalizeSelectedApp(app: string | null | undefined) {
  const normalized = app?.trim();
  return normalized || null;
}

export function readSettingDefineRouteState(searchParams: SettingDefineSearchParams = {}): SettingDefineRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  return {
    app: normalizeSelectedApp(reader.get('app'))
  };
}

export function readSettingDefineRouteStateFromSearch(search = ''): SettingDefineRouteState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    app: normalizeSelectedApp(params.get('app'))
  };
}
