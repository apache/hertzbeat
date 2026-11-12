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

export type ChartPoint = [number, number] | null;
export function dashboardChartGeometry(
  points: ChartPoint[],
  start: number,
  end: number,
  variant: 'line' | 'area' | 'bars'
) {
  const values = points.flatMap(point => (point ? [point[1]] : []));
  if (!values.length || end <= start) return null;
  const min = variant === 'bars' ? 0 : Math.min(...values),
    max = Math.max(...values),
    range = max - min || 1;
  const baseline = variant === 'bars' ? 64 : 88,
    height = variant === 'bars' ? 90 : 120;
  const x = (time: number) => 80 + ((time - start) / (end - start)) * 232;
  const y = (value: number) => baseline - ((value - min) / range) * (baseline - 18);
  const path = points
    .map((point, index) =>
      !point ? '' : `${index > 0 && points[index - 1] !== null ? 'L' : 'M'}${x(point[0])},${y(point[1])}`
    )
    .join(' ');
  const area = path
    .split(/(?=M)/)
    .filter(Boolean)
    .map(segment => {
      const pairs = segment.match(/-?[0-9.]+,-?[0-9.]+/g) ?? [];
      return pairs.length
        ? `${segment} L${pairs.at(-1)!.split(',')[0]},${baseline} L${pairs[0]!.split(',')[0]},${baseline} Z`
        : '';
    })
    .join(' ');
  return { min, max, baseline, height, x, y, path, area };
}
