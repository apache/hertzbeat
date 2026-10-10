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

import { formatLogNumericValue } from './log-throughput-display';
import type { TFunction } from 'i18next';
import { type LogMeasurement } from '../../logs/log-measure';
import { type LogAnalysisGroup, type LogAnalysisResult } from '../../logs/log-analysis';

import styles from './log-analysis.module.css';

export function LogMeasureValue({
  measurement,
  t,
  approximate = false
}: {
  measurement: LogMeasurement;
  t: TFunction;
  approximate?: boolean;
}) {
  return measurement.state === 'ready' ? (
    <span title={String(measurement.value)}>{formatLogNumericValue(measurement.value!)}</span>
  ) : (
    <span>
      {t(
        approximate && measurement.state === 'non_finite'
          ? 'explore.logAnalysis.percentileUnavailable'
          : `explore.logAnalysis.${measurement.state}`
      )}
    </span>
  );
}
export function LogAnalysisRankBar({ group, data }: { group: LogAnalysisGroup; data: LogAnalysisResult }) {
  const amount = data.measure ? group.measurement?.value : group.count;
  if (amount == null) return null;
  const values = data.groups.flatMap(item => {
    const value = data.measure ? item.measurement?.value : item.count;
    return value == null ? [] : [value];
  });
  const scale = Math.max(...values.map(Math.abs));
  if (!scale) return null;
  const normalized = values.map(value => value / scale);
  const min = Math.min(0, ...normalized),
    max = Math.max(0, ...normalized),
    range = max - min;
  if (!range) return null;
  const zero = (-min / range) * 100;
  const position = ((amount / scale - min) / range) * 100;
  return (
    <>
      <span className={styles.zeroAxis} aria-hidden style={{ left: `${zero}%` }} />
      <span
        className={styles.bar}
        aria-hidden
        style={{ left: `${Math.min(zero, position)}%`, width: `${Math.abs(position - zero)}%` }}
      />
    </>
  );
}
