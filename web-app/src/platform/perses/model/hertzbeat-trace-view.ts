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

import { z } from 'zod';
import { validTraceColumns, DEFAULT_TRACE_COLUMNS, type HertzBeatTraceColumn } from '../runtime/perses-trace-display';
const schema = z
  .object({
    version: z.literal(1),
    columns: z.custom<HertzBeatTraceColumn[]>(validTraceColumns),
    density: z.enum(['compact', 'comfortable']),
    mode: z.enum(['list', 'groups']),
    population: z.enum(['matched_traces', 'matched_spans']),
    groupBy: z.enum(['serviceName', 'operationName', 'environment'])
  })
  .strict();
export type TraceView = z.infer<typeof schema>;
export const DEFAULT_TRACE_VIEW: TraceView = {
  version: 1,
  columns: DEFAULT_TRACE_COLUMNS,
  density: 'compact',
  mode: 'list',
  population: 'matched_traces',
  groupBy: 'serviceName'
};
export function parseTraceView(value: string): TraceView {
  if (encodeURIComponent(value).length > 6000) throw new Error('Trace view exceeds URL size limit');
  return schema.parse(JSON.parse(value));
}
export function encodeTraceView(value: TraceView) {
  const encoded = JSON.stringify(schema.parse(value));
  parseTraceView(encoded);
  return encoded;
}
export function validTraceView(value: string | undefined) {
  if (value === undefined) return true;
  try {
    parseTraceView(value);
    return true;
  } catch {
    return false;
  }
}

export function readTraceView(value: string | undefined): TraceView | undefined {
  if (value === undefined) return DEFAULT_TRACE_VIEW;
  try {
    return parseTraceView(value);
  } catch {
    return undefined;
  }
}
