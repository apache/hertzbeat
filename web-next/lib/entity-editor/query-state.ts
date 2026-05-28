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

  if (source === 'otlp-candidate') {
    return {
      source,
      monitorId: cleanParam(searchParams.monitorId),
      identityKey: cleanParam(searchParams.identityKey),
      identityValue: cleanParam(searchParams.identityValue),
      serviceName: cleanParam(searchParams.serviceName),
      serviceNamespace: cleanParam(searchParams.serviceNamespace),
      environment: cleanParam(searchParams.environment)
    };
  }

  return {
    source,
    monitorId: cleanParam(searchParams.monitorId)
  };
}
