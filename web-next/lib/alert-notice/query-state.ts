import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import { readSignalRouteContext, type SignalRouteContext } from '../signal-route-context';

export type AlertNoticeSearchParams = SearchParamsRecord;

export type AlertNoticeRouteState = {
  signal: string | null;
  signalContext: SignalRouteContext;
};

function normalizeSignal(value: string | null | undefined) {
  return value === 'metrics' || value === 'logs' || value === 'traces' ? value : null;
}

export function readAlertNoticeRouteState(searchParams: AlertNoticeSearchParams = {}): AlertNoticeRouteState {
  const reader = createCompatSearchParamReader(searchParams);
  const signal = normalizeSignal(reader.get('signal'));

  return {
    signal,
    signalContext: signal ? readSignalRouteContext(reader) : {}
  };
}
