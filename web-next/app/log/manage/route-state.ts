import {
  buildLogRouteUrl,
  copyLogRouteContextParams,
  type LogQueryState,
  type LogWorkbenchView,
  type SearchParamReader
} from '../../../lib/log-manage/query-state';
import { appendTimeContextParams, type TimeContext } from '../../../lib/time-context';

export function buildLogManageRoute(
  searchParams: SearchParamReader,
  nextQuery: LogQueryState,
  view: LogWorkbenchView,
  timeContext?: TimeContext
) {
  const next = new URLSearchParams(buildLogRouteUrl(nextQuery, { view }).split('?')[1] || '');
  copyLogRouteContextParams(searchParams, next);
  if (timeContext) {
    appendTimeContextParams(next, timeContext);
  }
  return next.toString() ? `/log/manage?${next.toString()}` : '/log/manage';
}

export function buildResetLogManageRoute(searchParams: SearchParamReader, view: LogWorkbenchView) {
  return buildLogManageRoute(
    searchParams,
    { search: '', logContent: '', traceId: '', spanId: '', severityNumber: '', severityText: '' },
    view
  );
}
