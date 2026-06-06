import { buildTraceRouteUrl, type TraceExplorerView, type TraceQueryState } from '../../../lib/trace-manage/query-state';
import { appendSignalRouteContext, type SignalRouteContext } from '../../../lib/signal-route-context';
import { appendTimeContextParams, type TimeContext } from '../../../lib/time-context';

export function buildTraceManageRoute(
  routeContext: SignalRouteContext,
  nextQuery: TraceQueryState,
  options?: TimeContext | { view?: TraceExplorerView; timeContext?: TimeContext }
) {
  const routeOptions =
    options && ('view' in options || 'timeContext' in options)
      ? options
      : { timeContext: options as TimeContext | undefined };
  const next = new URLSearchParams(buildTraceRouteUrl(nextQuery, { view: routeOptions.view }).split('?')[1] || '');
  appendSignalRouteContext(next, routeContext);
  if (routeOptions.timeContext) {
    appendTimeContextParams(next, routeOptions.timeContext);
  }
  return next.toString() ? `/trace/manage?${next.toString()}` : '/trace/manage';
}

export function buildResetTraceManageRoute(routeContext: SignalRouteContext, view?: TraceExplorerView) {
  return buildTraceManageRoute(routeContext, { traceId: '', spanId: '', serviceName: '', errorOnly: false, spanScope: 'root' }, { view });
}
