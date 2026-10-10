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

export const TRACE_COLUMNS = [
  'traceName',
  'service',
  'spanCount',
  'errorCount',
  'duration',
  'startTime',
  'traceId'
] as const;
export type HertzBeatTraceColumn = (typeof TRACE_COLUMNS)[number];
export type HertzBeatTraceDisplay = { columns: HertzBeatTraceColumn[]; density: 'compact' | 'comfortable' };
export const DEFAULT_TRACE_COLUMNS: HertzBeatTraceColumn[] = ['traceName', 'spanCount', 'duration', 'startTime'];
export function validTraceColumns(value: unknown): value is HertzBeatTraceColumn[] {
  return (
    Array.isArray(value) &&
    value.length <= TRACE_COLUMNS.length &&
    value.includes('traceName') &&
    new Set(value).size === value.length &&
    value.every(column => TRACE_COLUMNS.some(key => key === column))
  );
}
