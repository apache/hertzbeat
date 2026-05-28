import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type AlertNoticeSearchParams = SearchParamsRecord;

export type AlertNoticeRouteState = {
  signal: string | null;
  signalContext: SignalRouteContext;
};

export function readAlertNoticeRouteState(searchParams: AlertNoticeSearchParams = {}): AlertNoticeRouteState {
  const reader = createCompatSearchParamReader(searchParams);

  return {
    signal: reader.get('signal'),
    signalContext: readSignalRouteContext(reader)
  };
}
