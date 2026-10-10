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
export const LOG_ANALYSIS_INTERVALS = [
  1000, 5000, 10000, 30000, 60000, 300000, 900000, 1800000, 3600000, 21600000, 86400000
] as const;
export const logIntervalSchema = z
  .number()
  .refine(value => LOG_ANALYSIS_INTERVALS.some(interval => interval === value));
export function validLogIntervalGrid(window: { start: number; end: number }, interval: number | null) {
  return (
    interval === null ||
    (logIntervalSchema.safeParse(interval).success &&
      Math.floor(window.end / interval) - Math.floor(window.start / interval) + 1 <= 60)
  );
}
export function requestedLogInterval(analysis: { representation: string; intervalMs?: number | undefined }) {
  return analysis.representation === 'timeseries' ? analysis.intervalMs : undefined;
}
export function matchesLogInterval(
  actual: number | null,
  analysis: { representation: string; intervalMs?: number | undefined }
) {
  const expected = requestedLogInterval(analysis);
  return expected === undefined || expected === actual;
}
