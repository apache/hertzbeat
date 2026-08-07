/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import styles from './notification-workspace-navigation.module.css?raw';

describe('notification workspace layout contract', () => {
  it('wraps dependency guidance without clipping and keeps step rows equal height', () => {
    const stepsRule = styles.match(/\.steps\s*\{[^}]*\}/)?.[0] ?? '';
    const dependencyRule = styles.match(/\.dependency\s*\{[^}]*\}/)?.[0] ?? '';

    expect(stepsRule).toMatch(/grid-auto-rows:\s*1fr/);
    expect(dependencyRule).toMatch(/white-space:\s*normal/);
    expect(dependencyRule).toMatch(/overflow-wrap:\s*anywhere/);
    expect(dependencyRule).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(dependencyRule).not.toMatch(/overflow:\s*hidden/);
  });

  it('uses semantic hover and selected surfaces instead of the page canvas', () => {
    expect(styles).toMatch(/\.steps\s+a:hover\s*\{[^}]*background:\s*var\(--hb-bg-hover\)/s);
    expect(styles).toMatch(/\.current\s+a\s*\{[^}]*background:\s*var\(--hb-nav-selected\)/s);
    expect(styles).not.toMatch(/\.current\s+a\s*\{[^}]*background:\s*var\(--hb-bg-canvas\)/s);
  });
});
