import { buildTraceRouteUrl, type TraceQueryState } from '../../../lib/trace-manage/query-state';
import { appendSignalRouteContext, type SignalRouteContext } from '../../../lib/signal-route-context';
import { appendTimeContextParams, type TimeContext } from '../../../lib/time-context';

export function buildTraceManageRoute(
  routeContext: SignalRouteContext,
  nextQuery: TraceQueryState,
  timeContext?: TimeContext
) {
  const next = new URLSearchParams(buildTraceRouteUrl(nextQuery).split('?')[1] || '');
  appendSignalRouteContext(next, routeContext);
  if (timeContext) {
    appendTimeContextParams(next, timeContext);
  }
  return next.toString() ? `/trace/manage?${next.toString()}` : '/trace/manage';
}

export function buildResetTraceManageRoute(routeContext: SignalRouteContext) {
  return buildTraceManageRoute(routeContext, { traceId: '', spanId: '', serviceName: '', errorOnly: false });
}
