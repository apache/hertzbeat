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

import { useCallback, useEffect, useState } from 'react';
import { useDashboardMetricTransition } from './use-dashboard-metric-transition';
import { useDashboardRotationCountdown } from './use-dashboard-rotation-countdown';
export function useDashboardMetricRotation(count: number, hidden: boolean, reducedMotion: boolean) {
  const { metricIndex, metricExiting, transitioning, changeMetric } = useDashboardMetricTransition(
    count,
    reducedMotion
  );
  const [metricPaused, setMetricPaused] = useState(false);
  const [metricInteracting, setMetricInteracting] = useState(false);
  const canRotate = !metricPaused && !metricInteracting && !hidden && !reducedMotion && count > 1 && !transitioning;
  const advance = useCallback(() => changeMetric(1), [changeMetric]);
  const { remainingMs, reset } = useDashboardRotationCountdown(canRotate, advance);
  useEffect(() => reset(), [count, reset]);
  return {
    metricIndex,
    metricRemainingMs: remainingMs,
    metricPaused,
    setMetricPaused,
    setMetricInteracting,
    metricExiting,
    canRotate,
    nextMetric: () => {
      reset();
      changeMetric(1);
    },
    previousMetric: () => {
      reset();
      changeMetric(-1);
    }
  };
}
