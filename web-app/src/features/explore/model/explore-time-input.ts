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

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
export const inputFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS";
export function parseWallTime(value: string, zone: string, original: number) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/u.test(value)) return NaN;
  const [clock, fraction = ''] = value.split('.');
  const normalized = `${clock?.length === 16 ? `${clock}:00` : clock}.${fraction.padEnd(3, '0')}`;
  if (normalized === formatInTimeZone(original, zone, inputFormat)) return original;
  const date = fromZonedTime(normalized, zone);
  if (!Number.isFinite(date.getTime())) return NaN;
  return formatInTimeZone(date, zone, inputFormat) === normalized ? date.getTime() : NaN;
}
