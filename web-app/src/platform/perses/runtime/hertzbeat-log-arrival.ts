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

import { claimLogArrival, LOG_ARRIVAL_DURATION, type LogArrival } from '@/shared/log-arrival';

const rendered = new WeakMap<HTMLElement, { arrival: LogArrival | undefined; animation?: Animation }>();

export function animateLogArrival(row: HTMLElement, arrival: LogArrival | undefined) {
  const previous = rendered.get(row);
  if (previous?.arrival === arrival) return;
  previous?.animation?.cancel();
  const state: { arrival: LogArrival | undefined; animation?: Animation } = { arrival };
  rendered.set(row, state);
  const elapsed = claimLogArrival(arrival);
  if (
    elapsed === undefined ||
    !window.matchMedia('(prefers-reduced-motion: no-preference)').matches ||
    row.getAttribute('aria-selected') === 'true' ||
    typeof row.animate !== 'function'
  )
    return;
  const style = getComputedStyle(row);
  const background = style.getPropertyValue('--hb-log-arrival-background').trim();
  if (!background) return;
  const animation = row.animate(
    [
      { backgroundColor: background, offset: 0 },
      { backgroundColor: background, offset: 0.5, easing: 'ease' },
      { backgroundColor: style.backgroundColor, offset: 1 }
    ],
    { duration: LOG_ARRIVAL_DURATION, easing: 'linear', iterations: 1 }
  );
  animation.currentTime = elapsed;
  state.animation = animation;
}
