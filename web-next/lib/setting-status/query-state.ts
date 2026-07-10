import type { SearchParamsRecord } from '../compat/search-params';

export type SettingStatusMode = 'component' | 'incident';
export type SettingStatusSearchParams = SearchParamsRecord;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readSettingStatusMode(searchParams: SettingStatusSearchParams | undefined): SettingStatusMode {
  return firstParam(searchParams?.tab) === 'incident' ? 'incident' : 'component';
}
