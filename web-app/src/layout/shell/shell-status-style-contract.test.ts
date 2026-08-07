/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import appStyles from '../../app/styles.css?raw';
import shellStyles from './hertzbeat-shell.module.css?raw';

describe('shell runtime status style contract', () => {
  it.each(['loading', 'available', 'degraded', 'unavailable', 'unknown'])(
    'maps %s to its semantic HertzBeat status token',
    status => {
      expect(shellStyles).toContain(`.statusSlot[data-status='${status}'] .statusDot`);
      expect(shellStyles).toContain(`var(--hb-status-${status})`);
    }
  );

  it('defines globally resolvable status tokens without adding raw colors to the shell component', () => {
    expect(appStyles).toMatch(/--hb-status-loading:\s*var\(--hb-status-unknown\)/);
    const lightTheme = appStyles.match(/:root\[data-theme='default'\]\s*\{[^}]*\}/)?.[0] ?? '';
    for (const status of ['available', 'degraded', 'unavailable']) {
      expect(appStyles).toMatch(new RegExp(`--hb-status-${status}:\\s*#[\\da-f]{6}`, 'i'));
      expect(lightTheme).toMatch(new RegExp(`--hb-status-${status}:\\s*#[\\da-f]{6}`, 'i'));
    }
    expect(appStyles).not.toMatch(/--hb-status-(?:available|degraded|unavailable):\s*var\(--ant-/);
    expect(shellStyles).not.toMatch(/#[\da-f]{3,8}|rgb\(|hsl\(/i);
  });

  it('distinguishes loading from an unknown steady state', () => {
    expect(shellStyles).toMatch(/data-status='loading'[\s\S]*?border-style:\s*dashed/);
    expect(shellStyles).toMatch(/data-status='unknown'[\s\S]*?border-style:\s*solid/);
  });

  it('sizes status slots to their concise visible state instead of clipping diagnostic text', () => {
    const slotRule = shellStyles.match(/\.statusSlot\s*\{[^}]*\}/)?.[0] ?? '';
    const valueRule = shellStyles.match(/\.statusValue\s*\{[^}]*\}/)?.[0] ?? '';

    expect(slotRule).toMatch(/flex:\s*0 0 auto/);
    expect(valueRule).not.toMatch(/overflow:\s*hidden/);
    expect(valueRule).not.toMatch(/text-overflow:\s*ellipsis/);
  });

  it('presents status as part of the header spine instead of boxed pills and keeps the signal prominent', () => {
    const slotRule = shellStyles.match(/\.statusSlot\s*\{[^}]*\}/)?.[0] ?? '';
    const dotRule = shellStyles.match(/\.statusDot\s*\{[^}]*\}/)?.[0] ?? '';

    expect(slotRule).not.toMatch(/border:/);
    expect(slotRule).not.toMatch(/border-radius:/);
    expect(dotRule).toMatch(/width:\s*8px/);
    expect(dotRule).toMatch(/height:\s*8px/);
  });
});
