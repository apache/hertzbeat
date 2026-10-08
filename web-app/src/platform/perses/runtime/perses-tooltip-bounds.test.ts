/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { afterEach, expect, it, vi } from 'vitest';
import { assembleTransform, getTooltipStyles } from '@perses-dev/components/dist/TimeSeriesTooltip/utils';
afterEach(() => vi.unstubAllGlobals());
const pointer = { page: { x: 250, y: 300 }, plotCanvas: { x: 200, y: 200 } };
it('keeps a viewport-sized tooltip inside both narrow-screen edges', () => {
  vi.stubGlobal('innerWidth', 390);
  const result = assembleTransform(pointer as never, null, 300, 374, undefined);
  const x = Number(result?.match(/translate3d\(([-\d.]+)px/)?.[1]);
  expect(x).toBeGreaterThanOrEqual(8);
  expect(x + 374).toBeLessThanOrEqual(382);
});
it('accounts for a positioned scroll container when clamping to viewport edges', () => {
  vi.stubGlobal('innerWidth', 390);
  const container = document.createElement('div');
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ left: 24, top: 0, height: 887 } as DOMRect);
  const result = assembleTransform(pointer as never, null, 300, 374, container);
  const x = Number(result?.match(/translate3d\(([-\d.]+)px/)?.[1]);
  expect(x + 24).toBeGreaterThanOrEqual(8);
  expect(x + 24 + 374).toBeLessThanOrEqual(382);
});

it('keeps ordinary desktop cursor placement and caps narrow border-box width', () => {
  vi.stubGlobal('innerWidth', 1645);
  expect(assembleTransform(pointer as never, null, 300, 375, undefined)).toBe('translate3d(282px, 316px, 0)');
  const styles = getTooltipStyles({ palette: {}, zIndex: { tooltip: 1500 } } as never, null, undefined);
  expect(styles.boxSizing).toBe('border-box');
  expect(styles.maxWidth).toContain('calc(100vw - 16px)');
  expect(styles.minWidth).toContain('calc(100vw - 16px)');
});
it('keeps pinned tooltip above result headers but below the host header and inspector', () => {
  const theme = { palette: {}, zIndex: { tooltip: 1500 } } as never;
  const pinned = getTooltipStyles(theme, pointer as never, undefined);
  expect(pinned.zIndex).toBe(3);
  expect(pinned.zIndex).toBeGreaterThan(2);
  expect(pinned.zIndex).toBeLessThan(20);
  expect(getTooltipStyles(theme, null, undefined).zIndex).toBe(1500);
});
