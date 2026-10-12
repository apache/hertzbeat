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

import { alpha, type Theme } from '@mui/material/styles';
import { generateChartsTheme } from '@perses-dev/components';

export function createHertzBeatChartsTheme(
  theme: Theme,
  compact = false,
  reducedMotion = false,
  countAxisMax?: number
) {
  const dark = theme.palette.mode === 'dark';
  const axis = {
    axisLabel: { color: theme.palette.text.secondary, fontSize: 11, hideOverlap: true },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: alpha(theme.palette.text.primary, dark ? 0.24 : 0.14) } },
    splitLine: { lineStyle: { color: alpha(theme.palette.text.primary, dark ? 0.12 : 0.07), width: 1, opacity: 1 } }
  };
  const generated = generateChartsTheme(theme, {
    echartsTheme: {
      textStyle: { fontSize: 11 },
      categoryAxis: axis,
      timeAxis: {
        ...axis,
        ...(compact && countAxisMax !== undefined
          ? {
              axisLabel: { ...axis.axisLabel, alignMinLabel: 'left', alignMaxLabel: 'right' },
              splitLine: { ...axis.splitLine, show: false }
            }
          : {})
      },
      valueAxis: {
        ...axis,
        axisLine: { show: false },
        ...(compact
          ? {
              ...(countAxisMax !== undefined
                ? { splitNumber: 1, minInterval: 1, interval: Math.max(1, Math.ceil(countAxisMax)) }
                : {}),
              axisLabel: {
                ...axis.axisLabel,
                show: countAxisMax !== undefined,
                showMinLabel: countAxisMax !== undefined,
                showMaxLabel: countAxisMax !== undefined
              }
            }
          : {})
      },
      legend: { backgroundColor: 'transparent', textStyle: { color: theme.palette.text.secondary, fontSize: 11 } },
      line: { connectNulls: false, smooth: false },
      bar: { barWidth: '50%', barMaxWidth: 25 },
      ...(reducedMotion ? { animation: false } : {})
    }
  });
  // Overview counts are neutral; brand color remains reserved for active controls.
  // Assign after merging because the native merger retains palette array tails.
  if (compact) generated.echartsTheme.color = [histogramColor(theme, countAxisMax)];
  return generated;
}

function histogramColor(theme: Theme, countAxisMax?: number) {
  return countAxisMax === undefined ? theme.palette.primary.main : theme.palette.text.secondary;
}
