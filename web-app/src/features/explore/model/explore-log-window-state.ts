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

import type { SharedTimeValue } from '@/shared/time';
import type { LogExploreQuery } from './explore-model';

export function logResumeRefreshInterval(
  query: LogExploreQuery,
  time: SharedTimeValue | null | undefined,
  currentInterval: number
) {
  return (
    positiveRefreshInterval(query.autoRefreshMs) ?? positiveRefreshInterval(time?.autoRefreshMs) ?? currentInterval
  );
}

export function positiveRefreshInterval(interval: number | undefined) {
  return interval != null && interval > 0 ? interval : undefined;
}

export function fixedLogWindow(query: LogExploreQuery) {
  return query.start != null && query.end != null ? { from: query.start, to: query.end } : undefined;
}
