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

import { useId } from 'react';
import { dashboardChartGeometry, type ChartPoint } from '../model/dashboard-chart-geometry';
import styles from './dashboard-signals.module.css';
type Props = {
  points: ChartPoint[];
  start: number;
  end: number;
  label: string;
  formatValue?: (value: number) => string;
  exactValue?: (value: number) => string;
  variant?: 'line' | 'area' | 'bars';
};
export function DashboardSparkline({
  points,
  start,
  end,
  label,
  formatValue = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  exactValue = formatValue,
  variant = 'line'
}: Props) {
  const fillId = useId(),
    plot = dashboardChartGeometry(points, start, end, variant);
  if (!plot) return null;
  const time = (value: number) => new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={styles.sparkline} role="img" aria-label={label}>
      <span className={styles.axisMax}>{formatValue(plot.max)}</span>
      <span className={styles.axisMin} style={{ top: `${(plot.baseline / plot.height) * 100}%` }}>
        {formatValue(plot.min)}
      </span>
      <span className={styles.axisStart}>{time(start)}</span>
      <span className={styles.axisEnd}>{time(end)}</span>
      <svg viewBox={`0 0 320 ${plot.height}`} preserveAspectRatio="none" aria-hidden="true">
        {variant === 'area' && (
          <>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.07" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={plot.area} fill={`url(#${fillId})`} />
          </>
        )}
        {variant === 'bars' ? (
          <BarMarks points={points} plot={plot} exact={exactValue} />
        ) : (
          <>
            <path d={plot.path} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            <HoverMarks points={points} plot={plot} exact={exactValue} />
          </>
        )}
      </svg>
    </div>
  );
}
type MarksProps = {
  points: ChartPoint[];
  plot: NonNullable<ReturnType<typeof dashboardChartGeometry>>;
  exact: (value: number) => string;
};
function BarMarks({ points, plot, exact }: MarksProps) {
  return (
    <>
      {points.map(
        (point, index) =>
          point && (
            <rect
              key={index}
              x={plot.x(point[0]) - 2}
              y={plot.y(point[1])}
              width="4"
              height={Math.max(0, plot.baseline - plot.y(point[1]))}
              fill="currentColor"
            >
              <title>
                {new Date(point[0]).toLocaleTimeString()} · {exact(point[1])}
              </title>
            </rect>
          )
      )}
    </>
  );
}
function HoverMarks({ points, plot, exact }: MarksProps) {
  return (
    <>
      {points.map(
        (point, index) =>
          point && (
            <circle key={index} cx={plot.x(point[0])} cy={plot.y(point[1])} r="7" className={styles.plotPoint}>
              <title>
                {new Date(point[0]).toLocaleTimeString()} · {exact(point[1])}
              </title>
            </circle>
          )
      )}
    </>
  );
}
