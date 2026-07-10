import type { SearchParamsRecord } from '../compat/search-params';
import type { EntityEditorNewDraftSeed } from './controller';

export type EntityNewSearchParams = SearchParamsRecord;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | string[] | undefined) {
  const normalized = firstParam(value)?.trim();
  return normalized ? normalized : null;
}

export function readEntityNewDraftSeed(searchParams: EntityNewSearchParams = {}): EntityEditorNewDraftSeed {
  const source = cleanParam(searchParams.source);
  const monitorName = cleanParam(searchParams.monitorName);
  const monitorApp = cleanParam(searchParams.monitorApp);
  const monitorInstance = cleanParam(searchParams.monitorInstance);
  const returnTo = cleanParam(searchParams.returnTo);
  const monitorContext = {
    ...(monitorName ? { monitorName } : {}),
    ...(monitorApp ? { monitorApp } : {}),
    ...(monitorInstance ? { monitorInstance } : {}),
    ...(returnTo ? { returnTo } : {})
  };

  if (source === 'otlp-candidate') {
    return {
      source,
      monitorId: cleanParam(searchParams.monitorId),
      ...monitorContext,
      identityKey: cleanParam(searchParams.identityKey),
      identityValue: cleanParam(searchParams.identityValue),
      serviceName: cleanParam(searchParams.serviceName),
      serviceNamespace: cleanParam(searchParams.serviceNamespace),
      environment: cleanParam(searchParams.environment)
    };
  }

  return {
    source,
    monitorId: cleanParam(searchParams.monitorId),
    ...monitorContext
  };
}
