/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type PublicStatusIncidentRange = {
  year: number;
  startTime: number;
  endTime: number | null;
};

export const earliestPublicStatusIncidentYear = 1970;

export function createPublicStatusIncidentRange(year: number, now: Date = new Date()): PublicStatusIncidentRange {
  const currentYear = now.getFullYear();
  if (!isPublicStatusIncidentYear(year, currentYear)) {
    throw new RangeError('Invalid public status incident year');
  }
  return {
    year,
    startTime: localYearBoundary(year),
    endTime: year === currentYear ? null : localYearBoundary(year + 1) - 1
  };
}

export function isPublicStatusIncidentYear(year: number, currentYear: number) {
  return Number.isSafeInteger(year) && year >= earliestPublicStatusIncidentYear && year <= currentYear;
}

function localYearBoundary(year: number) {
  const boundary = new Date(0);
  boundary.setFullYear(year, 0, 1);
  boundary.setHours(0, 0, 0, 0);
  return boundary.getTime();
}
