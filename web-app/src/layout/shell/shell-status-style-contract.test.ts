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

  it('defines semantic status tokens without adding raw colors to the shell component', () => {
    for (const status of ['loading', 'available', 'degraded', 'unavailable']) {
      expect(appStyles).toMatch(new RegExp(`--hb-status-${status}:\\s*var\\(--`));
    }
    expect(shellStyles).not.toMatch(/#[\da-f]{3,8}|rgb\(|hsl\(/i);
  });

  it('distinguishes loading from an unknown steady state', () => {
    expect(shellStyles).toMatch(/data-status='loading'[\s\S]*?border-style:\s*dashed/);
    expect(shellStyles).toMatch(/data-status='unknown'[\s\S]*?border-style:\s*solid/);
  });
});
