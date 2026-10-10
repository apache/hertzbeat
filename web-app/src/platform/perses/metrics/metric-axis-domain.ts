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

export type MetricAxisDomain = { min?: number | undefined; max?: number | undefined };
export function metricAxisBoundsValid(domain: MetricAxisDomain) {
  if (![domain.min, domain.max].every(value => value === undefined || Number.isFinite(value))) return false;
  return (
    domain.min === undefined ||
    domain.max === undefined ||
    (domain.min < domain.max && Number.isFinite(domain.max - domain.min))
  );
}
export function metricAxisDataExtent(values: Iterable<number | null>): MetricAxisDomain | undefined {
  let min = Infinity,
    max = -Infinity;
  for (const value of values) {
    if (value === null) continue;
    if (!Number.isFinite(value)) return { min: NaN, max: NaN };
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return min === Infinity ? undefined : { min, max };
}
