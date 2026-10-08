/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
