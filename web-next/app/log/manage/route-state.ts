import {
  buildLogRouteUrl,
  type LogQueryState,
  type LogWorkbenchView
} from '../../../lib/log-manage/query-state';
import { appendSignalRouteContext, type SignalRouteContext } from '../../../lib/signal-route-context';
import { appendTimeContextParams, type TimeContext } from '../../../lib/time-context';

export function buildLogManageRoute(
  routeContext: SignalRouteContext,
  nextQuery: LogQueryState,
  view: LogWorkbenchView,
  timeContext?: TimeContext
) {
  const next = new URLSearchParams(buildLogRouteUrl(nextQuery, { view }).split('?')[1] || '');
  appendSignalRouteContext(next, routeContext);
  if (timeContext) {
    appendTimeContextParams(next, timeContext);
  }
  return next.toString() ? `/log/manage?${next.toString()}` : '/log/manage';
}

export function buildResetLogManageRoute(routeContext: SignalRouteContext, view: LogWorkbenchView) {
  return buildLogManageRoute(
    routeContext,
    { search: '', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
    view
  );
}
