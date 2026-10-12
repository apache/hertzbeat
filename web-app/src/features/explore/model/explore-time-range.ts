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

export type ExploreTimeRange = 'last-15m' | 'last-30m' | 'last-1h' | 'last-6h' | 'last-24h';
export function timeRangeMilliseconds(timeRange: ExploreTimeRange) {
  const minutes: Record<ExploreTimeRange, number> = {
    'last-15m': 15,
    'last-30m': 30,
    'last-1h': 60,
    'last-6h': 360,
    'last-24h': 1440
  };
  return minutes[timeRange] * 60_000;
}
