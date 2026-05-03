import { buildTraceRouteUrl, type SearchParamReader, type TraceQueryState } from '../../../lib/trace-manage/query-state';
import { copySignalRouteContextParams } from '../../../lib/signal-route-context';
import { appendTimeContextParams, type TimeContext } from '../../../lib/time-context';

export function buildTraceManageRoute(searchParams: SearchParamReader, nextQuery: TraceQueryState, timeContext?: TimeContext) {
  const next = new URLSearchParams(buildTraceRouteUrl(nextQuery).split('?')[1] || '');
  copySignalRouteContextParams(searchParams, next);
  if (timeContext) {
    appendTimeContextParams(next, timeContext);
  }
  return next.toString() ? `/trace/manage?${next.toString()}` : '/trace/manage';
}

export function buildResetTraceManageRoute(searchParams: SearchParamReader) {
  return buildTraceManageRoute(searchParams, { traceId: '', spanId: '', serviceName: '', errorOnly: false });
}
