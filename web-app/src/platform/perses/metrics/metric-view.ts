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
import { metricAxisBoundsValid } from './metric-axis-domain';
import { metricPoints, type MetricSeries } from './metric-series';
export const metricViewSchema = z
  .object({
    chart: z
      .object({
        display: z.enum(['line', 'bar']).optional(),
        legend: z.boolean().optional(),
        min: z.number().finite().optional(),
        max: z.number().finite().optional()
      })
      .strict()
      .refine(metricAxisBoundsValid)
      .optional(),
    mode: z.enum(['chart', 'split', 'table', 'number']),
    numberCalculation: z.enum(['latest', 'min', 'max', 'avg', 'sum', 'count']).optional(),
    hidden: z.array(z.string().regex(/^(?:[a-z]|f[1-4])$/u)).max(8),
    splitBy: z.string().max(128).optional(),
    splitRankBy: z
      .string()
      .regex(/^(?:[a-z]|f[1-4])$/u)
      .optional(),
    splitLimit: z.number().int().min(1).max(12).optional(),
    splitOrder: z.enum(['top', 'bottom']).optional(),
    splitScale: z.enum(['uniform', 'independent']).optional()
  })
  .strict();
export type MetricView = z.infer<typeof metricViewSchema>;
export function parseMetricView(value?: string): MetricView {
  if (value === undefined) return { mode: 'chart', hidden: [] };
  if (value.length > 2048) throw new Error('Metric view exceeds size limit');
  return metricViewSchema.parse(JSON.parse(value));
}
export function encodeMetricView(view: MetricView) {
  return JSON.stringify(metricViewSchema.parse(view));
}

export function visibleMetricSeries(series: MetricSeries[], view: MetricView) {
  return series.filter(
    item =>
      (!item.refId || !view.hidden.includes(item.refId)) && (view.mode === 'number' || metricPoints(item).length > 0)
  );
}
