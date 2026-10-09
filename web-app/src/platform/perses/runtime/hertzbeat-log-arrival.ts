/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
