import { copySignalRouteContextParams, type SearchParamReader as SignalSearchParamReader } from '../signal-route-context';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function createSearchParamReader(searchParams?: SearchParamsRecord): SignalSearchParamReader {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value[0]) {
        params.set(key, value[0]);
      }
      return;
    }
    if (value) {
      params.set(key, value);
    }
  });

  return {
    get(name: string) {
      return params.get(name);
    }
  };
}

export function buildLogIntegrationIngestionHref(searchParams: SignalSearchParamReader) {
  const params = new URLSearchParams({ signal: 'logs' });
  copySignalRouteContextParams(searchParams, params);
  const queryString = params.toString();
  return queryString ? `/ingestion/otlp?${queryString}` : '/ingestion/otlp';
}
