import { readEpochMillisRouteParam, stripReturnLabelFromHref } from '../signal-route-context';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

function normalizeCompatSearchParam(key: string, value: string) {
  if (key === 'returnLabel') return undefined;
  if (key === 'returnTo') return stripReturnLabelFromHref(value);
  if (key === 'start' || key === 'end') return readEpochMillisRouteParam(value);
  return value;
}

function buildCompatSearchParams(searchParams?: SearchParamsRecord) {
  const params = new URLSearchParams();

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    const appendValue = (rawValue: string) => {
      const normalized = normalizeCompatSearchParam(key, rawValue);
      if (normalized) {
        params.set(key, normalized);
      }
    };

    if (Array.isArray(value)) {
      if (value[0]) {
        appendValue(value[0]);
      }
      return;
    }

    if (value) {
      appendValue(value);
    }
  });

  return params;
}

export function buildCompatRedirectTarget(basePath: string, searchParams?: SearchParamsRecord) {
  const query = buildCompatSearchParams(searchParams).toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function createCompatSearchParamReader(searchParams?: SearchParamsRecord) {
  const params = buildCompatSearchParams(searchParams);

  return {
    get(name: string) {
      return params.get(name);
    }
  };
}
