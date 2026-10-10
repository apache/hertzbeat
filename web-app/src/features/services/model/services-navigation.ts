/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
