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

import type { LogAnalysisState } from '@/platform/perses';

export function calculatedGroupByAnalysis(current: LogAnalysisState, name: string): LogAnalysisState | undefined {
  if (hasUnsupportedAnalysis(current)) return undefined;
  const field = `calculated:${name}`;
  const dimensions =
    current.grouping?.dimensions ?? (current.field ? [{ field: current.field, limit: current.limit }] : []);
  if (dimensions.some(item => item.field === field)) return { ...current, representation: 'timeseries' };
  if (dimensions.length >= 4) return undefined;
  if (!dimensions.length) return { ...current, representation: 'timeseries', field, limit: 20 };
  const budget = Math.floor(100 / current.limit);
  if (budget < 2) return undefined;
  const next = [...dimensions, { field, limit: Math.min(20, budget) }];
  const rest = { ...current };
  delete rest.field;
  return {
    ...rest,
    representation: 'timeseries',
    grouping: { version: 1, dimensions: next },
    limit: next.reduce((product, item) => product * item.limit, 1)
  };
}

function hasUnsupportedAnalysis(current: LogAnalysisState) {
  return Boolean(current.transform || current.additionalMeasures?.length || current.comparison || current.querySet);
}
