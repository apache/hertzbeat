import type { SingleAlert } from '../types';
import { stripReturnLabelFromHref } from '../signal-route-context';

const OVERVIEW_SIGNAL_DESK_PATHS = new Set([
  '/log/manage',
  '/trace/manage',
  '/ingestion/otlp',
  '/ingestion/otlp/metrics'
]);

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value == null) {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

function setIfMissing(params: URLSearchParams, key: string, value: string | undefined) {
  if (!value || params.get(key)?.trim()) {
    return;
  }
  params.set(key, value);
}

export function buildOverviewSignalDeskHref(
  href: string,
  alert: Pick<SingleAlert, 'labels'> | null | undefined
) {
  if (!href.startsWith('/')) {
    return href;
  }

  const url = new URL(href, 'http://127.0.0.1');
  if (!OVERVIEW_SIGNAL_DESK_PATHS.has(url.pathname)) {
    return href;
  }

  const labels = alert?.labels || {};
  setIfMissing(url.searchParams, 'traceId', firstText(labels.traceId));
  setIfMissing(url.searchParams, 'spanId', firstText(labels.spanId));
  setIfMissing(url.searchParams, 'serviceName', firstText(labels.service, labels.app));
  setIfMissing(url.searchParams, 'serviceNamespace', firstText(labels.namespace));
  setIfMissing(url.searchParams, 'environment', firstText(labels.environment, labels.cluster));
  setIfMissing(url.searchParams, 'returnTo', '/overview');
  const cleanReturnTo = stripReturnLabelFromHref(url.searchParams.get('returnTo'));
  if (cleanReturnTo) {
    url.searchParams.set('returnTo', cleanReturnTo);
  } else {
    url.searchParams.delete('returnTo');
  }

  const queryString = url.searchParams.toString();
  return stripReturnLabelFromHref(queryString ? `${url.pathname}?${queryString}` : url.pathname) || url.pathname;
}
