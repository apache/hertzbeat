import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type EntityDetailSearchParams = SearchParamsRecord;

export function readEntityDetailRouteContext(searchParams: EntityDetailSearchParams = {}): SignalRouteContext {
  return readSignalRouteContext(createCompatSearchParamReader(searchParams));
}

export function readEntityDetailCreatedResult(searchParams: EntityDetailSearchParams = {}) {
  const rawValue = searchParams.created;
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return value === '1' || value === 'true';
}

export function readEntityDetailUpdatedResult(searchParams: EntityDetailSearchParams = {}) {
  const rawValue = searchParams.updated;
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return value === '1' || value === 'true';
}
