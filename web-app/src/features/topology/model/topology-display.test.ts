/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { formatTopologyWindow } from './topology-display';

describe('topology display model', () => {
  it('formats an exact window with the active locale instead of exposing epoch values', () => {
    const window = { from: 1_710_000_000_000, to: 1_710_003_600_000 };
    const english = formatTopologyWindow(window, 'en-US');
    const japanese = formatTopologyWindow(window, 'ja-JP');

    expect(english).not.toContain(String(window.from));
    expect(english).not.toContain(String(window.to));
    expect(japanese).not.toContain(String(window.from));
    expect(english).not.toBe(japanese);
  });

  it.each([
    undefined,
    { from: 0, to: 1000 },
    { from: 2000, to: 1000 },
    { from: Number.NaN, to: 1000 },
    { from: 1000, to: Number.MAX_SAFE_INTEGER }
  ])('renders missing or invalid window %s as unavailable', window => {
    expect(formatTopologyWindow(window, 'en-US')).toBe('—');
  });
});
