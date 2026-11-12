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

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

type Phase = 'idle' | 'exiting' | 'entering';
type Transition = {
  phase: Phase;
  queued: number;
  count: number;
  timer: number | undefined;
  setIndex: Dispatch<SetStateAction<number>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
};

export function useDashboardMetricTransition(count: number, reducedMotion: boolean) {
  const [metricIndex, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const state = useRef<Transition>({ phase: 'idle', queued: 0, count, timer: undefined, setIndex, setPhase });
  useEffect(() => () => window.clearTimeout(state.current.timer), []);
  useEffect(() => {
    const current = state.current;
    current.count = count;
    if ((reducedMotion || count <= 1) && current.phase !== 'idle') {
      window.clearTimeout(current.timer);
      current.timer = window.setTimeout(() => {
        const delta = current.queued;
        current.queued = 0;
        current.phase = 'idle';
        setPhase('idle');
        setIndex(index => normalizedIndex(index + delta, count));
      }, 0);
    }
  }, [count, reducedMotion]);
  const changeMetric = useCallback(
    (delta: number) => {
      const current = state.current;
      if (count <= 1) return;
      if (reducedMotion) {
        setIndex(index => normalizedIndex(index + delta, count));
        return;
      }
      current.queued += delta;
      if (current.phase === 'idle') exitMetric(current);
    },
    [count, reducedMotion]
  );
  return {
    metricIndex: normalizedIndex(metricIndex, count),
    metricExiting: !reducedMotion && count > 1 && phase === 'exiting',
    transitioning: !reducedMotion && count > 1 && phase !== 'idle',
    changeMetric
  };
}

function normalizedIndex(index: number, count: number) {
  const size = Math.max(1, count);
  return ((index % size) + size) % size;
}

function exitMetric(state: Transition) {
  state.phase = 'exiting';
  state.setPhase('exiting');
  state.timer = window.setTimeout(() => {
    const delta = state.queued;
    state.queued = 0;
    state.setIndex(index => normalizedIndex(index + delta, state.count));
    state.phase = 'entering';
    state.setPhase('entering');
    state.timer = window.setTimeout(() => {
      state.phase = 'idle';
      state.setPhase('idle');
      if (state.queued !== 0) exitMetric(state);
    }, 220);
  }, 180);
}
