import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type EntityDetailSearchParams = SearchParamsRecord;

export function readEntityDetailRouteContext(searchParams: EntityDetailSearchParams = {}): SignalRouteContext {
  return readSignalRouteContext(createCompatSearchParamReader(searchParams));
}
