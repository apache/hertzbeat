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

import isEqual from 'lodash/isEqual';
import { z } from 'zod';

import { hertzBeatQuerySchema, type HertzBeatQuery } from '../datasource/hertzbeat-query-contract';

type WithoutWindow<T> = T extends unknown ? Omit<T, 'timeWindow'> : never;
type DashboardQuery = WithoutWindow<HertzBeatQuery>;

export const dashboardQuerySchema = z.custom<DashboardQuery>(value => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'timeWindow' in value) return false;
  const scoped = { ...value, timeWindow: { from: 1, to: 2 } };
  const parsed = hertzBeatQuerySchema.safeParse(scoped);
  return parsed.success && isEqual(parsed.data, scoped) && !(parsed.data.queryKind === 'gantt' && 'context' in value);
}, 'Unsupported HertzBeat dashboard query');

export function validQueryVariables(query: DashboardQuery, names: Set<string>): boolean {
  const context = query.context ?? {};
  const remaining = { ...query, context: { ...context } };
  for (const name of ['serviceName', 'serviceNamespace', 'environment'] as const) {
    if (context[name] === '${' + name + '}' && names.has(name)) delete remaining.context[name];
  }
  // Analytical search and exact group values are literal payloads, never variable templates.
  const serialized = JSON.stringify(
    query.signal === 'logs' && query.queryKind === 'analysis' ? remaining.context : remaining
  );
  return !serialized.includes('${') && !serialized.includes('$__');
}
