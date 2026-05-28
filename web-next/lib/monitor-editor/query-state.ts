import { createCompatSearchParamReader, type SearchParamsRecord } from '../compat/search-params';
import type { MonitorEditorReturnContext } from './navigation';

export type MonitorNewSearchParams = SearchParamsRecord;
export type MonitorEditSearchParams = SearchParamsRecord;

export type MonitorNewRouteState = {
  app: string;
  returnContext: MonitorEditorReturnContext;
};

export type MonitorEditRouteState = {
  returnContext: MonitorEditorReturnContext;
};

function readMonitorEditorReturnContext(searchParams: SearchParamsRecord = {}): MonitorEditorReturnContext {
  const reader = createCompatSearchParamReader(searchParams);

  return {
    labels: reader.get('labels'),
    pageIndex: reader.get('pageIndex'),
    pageSize: reader.get('pageSize'),
    entityId: reader.get('entityId'),
    entityName: reader.get('entityName'),
    timeRange: reader.get('timeRange'),
    start: reader.get('start'),
    end: reader.get('end'),
    refresh: reader.get('refresh'),
    live: reader.get('live'),
    tz: reader.get('tz'),
    returnTo: reader.get('returnTo')
  };
}

export function readMonitorNewRouteState(searchParams: MonitorNewSearchParams = {}): MonitorNewRouteState {
  const reader = createCompatSearchParamReader(searchParams);

  return {
    app: reader.get('app') || 'website',
    returnContext: readMonitorEditorReturnContext(searchParams)
  };
}

export function hasMonitorNewAppParam(searchParams: MonitorNewSearchParams = {}) {
  const reader = createCompatSearchParamReader(searchParams);
  return Boolean(reader.get('app'));
}

export function buildMonitorNewDefaultAppRedirectUrl() {
  return '/monitors/new?app=website';
}

export function readMonitorEditRouteState(searchParams: MonitorEditSearchParams = {}): MonitorEditRouteState {
  return {
    returnContext: readMonitorEditorReturnContext(searchParams)
  };
}
