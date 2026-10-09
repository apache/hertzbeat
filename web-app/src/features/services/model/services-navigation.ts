/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { buildServicesPath, servicesExactWindow, type ServicesQuery } from '@/shared/navigation/services-path';
import { buildInvestigationSignalHandoffPath, parseQueryContext, type SignalKind } from '@/shared/query-context';

export function buildServiceSignalPath(source: ServicesQuery, signal: SignalKind) {
  const window = servicesExactWindow(source);
  if (!window) throw new Error('Service investigation requires a bounded exact window');
  const context = parseQueryContext(new URL(buildServicesPath(source), 'https://hertzbeat.local').searchParams);
  const url = new URL(
    buildInvestigationSignalHandoffPath(signal, context, { ...window, timeZone: source.timeZone ?? 'UTC' }),
    'https://hertzbeat.local'
  );
  url.searchParams.set('servicesReturnTo', buildServicesPath(source));
  if (signal === 'traces') {
    url.searchParams.set('spanScope', 'root');
    if (source.operation) url.searchParams.set('query', source.operation);
    if (source.errorsOnly) url.searchParams.set('errorOnly', 'true');
  }
  return `${url.pathname}?${url.searchParams}`;
}
