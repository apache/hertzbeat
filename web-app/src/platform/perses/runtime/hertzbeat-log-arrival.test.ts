/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { afterEach, expect, it, vi } from 'vitest';
import { animateLogArrival } from './hertzbeat-log-arrival';
import { logArrival, markLogArrival } from '@/shared/log-arrival';

afterEach(() => vi.restoreAllMocks());
function row() {
  const element = document.createElement('div');
  element.style.setProperty('--hb-log-arrival-background', '#eaf6fc');
  element.style.backgroundColor = 'white';
  const animation = { cancel: vi.fn(), currentTime: 0 };
  const animate = vi.fn(() => animation);
  Object.defineProperty(element, 'animate', { value: animate });
  return { element, animate, animation };
}
function arrival() {
  const record = {};
  markLogArrival(record, Date.now() - 50);
  return logArrival(record)!;
}
it('animates new rows once, preserves elapsed time and cancels a recycled row animation', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  const first = row(),
    remount = row(),
    token = arrival();
  animateLogArrival(first.element, token);
  expect(first.animate).toHaveBeenCalledOnce();
  expect(first.animate).toHaveBeenCalledWith(
    [
      { backgroundColor: '#eaf6fc', offset: 0 },
      { backgroundColor: '#eaf6fc', offset: 0.5, easing: 'ease' },
      { backgroundColor: 'rgb(255, 255, 255)', offset: 1 }
    ],
    { duration: 400, easing: 'linear', iterations: 1 }
  );
  expect(first.animation.currentTime).toBeGreaterThanOrEqual(50);
  animateLogArrival(first.element, token);
  animateLogArrival(remount.element, token);
  expect(first.animate).toHaveBeenCalledOnce();
  expect(remount.animate).not.toHaveBeenCalled();
  animateLogArrival(first.element, undefined);
  expect(first.animation.cancel).toHaveBeenCalledOnce();
  animateLogArrival(first.element, arrival());
  expect(first.animate).toHaveBeenCalledTimes(2);
});
it('does not animate selected rows or reduced-motion arrivals, including a later remount', () => {
  const media = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
  const reduced = row(),
    selected = row(),
    token = arrival();
  animateLogArrival(reduced.element, token);
  media.mockReturnValue({ matches: true } as MediaQueryList);
  animateLogArrival(row().element, token);
  selected.element.setAttribute('aria-selected', 'true');
  animateLogArrival(selected.element, arrival());
  expect(reduced.animate).not.toHaveBeenCalled();
  expect(selected.animate).not.toHaveBeenCalled();
});
