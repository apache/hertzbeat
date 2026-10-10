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

import { validateMetricPlan, type MetricPlan, type MetricQueryRow } from './metric-plan';
import { evaluateMetricComposition } from './metric-evaluation';
import type { MetricComposition, MetricSourceResult } from './metric-composition';

export async function executeMetricComposition(
  plan: MetricPlan,
  load: (row: MetricQueryRow) => Promise<MetricSourceResult>,
  signal?: AbortSignal
): Promise<MetricComposition> {
  if (validateMetricPlan(plan).length) throw new Error('Invalid metric composition');
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  const sources = await Promise.all(plan.queries.map(load));
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  return { plan, sources, formulas: evaluateMetricComposition(plan, sources) };
}
