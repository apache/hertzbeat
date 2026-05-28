import type { ActionSuggestionContext } from './model';

export type ActionsSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function readActionsSuggestionContext(searchParams: ActionsSearchParams | undefined): ActionSuggestionContext {
  if (!searchParams) return {};
  return {
    start: firstParam(searchParams.start),
    end: firstParam(searchParams.end),
    timeRange: firstParam(searchParams.timeRange),
    entityId: firstParam(searchParams.entityId),
    entityName: firstParam(searchParams.entityName),
    returnTo: firstParam(searchParams.returnTo),
    serviceName: firstParam(searchParams.serviceName),
    serviceNamespace: firstParam(searchParams.serviceNamespace),
    environment: firstParam(searchParams.environment),
    traceId: firstParam(searchParams.traceId),
    spanId: firstParam(searchParams.spanId),
    source: firstParam(searchParams.source),
    collector: firstParam(searchParams.collector),
    template: firstParam(searchParams.template),
    search: firstParam(searchParams.search),
    signal: firstParam(searchParams.signal),
    severity: firstParam(searchParams.severity),
    status: firstParam(searchParams.status),
    alertGroupId: firstParam(searchParams.alertGroupId),
    viewMode: firstParam(searchParams.viewMode),
    sourceKind: firstParam(searchParams.sourceKind),
    edgeId: firstParam(searchParams.edgeId)
  };
}
