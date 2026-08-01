/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import appStyles from './styles.css?raw';

describe('application interaction styles', () => {
  it('keeps keyboard focus visible without relying on hover state', () => {
    expect(appStyles).toMatch(/:where\(a,\s*button,\s*\[role='button'\],\s*\[tabindex\]\):focus-visible/);
    expect(appStyles).toMatch(/outline:\s*2px solid var\(--hb-focus-ring\)/);
  });

  it('removes nonessential motion when the operating system requests it', () => {
    const reducedMotion = appStyles.match(/@media \(prefers-reduced-motion:\s*reduce\)\s*\{(?<body>[\s\S]*)\}/)?.groups
      ?.body;

    expect(reducedMotion).toMatch(/animation-duration:\s*0\.01ms !important/);
    expect(reducedMotion).toMatch(/transition-duration:\s*0\.01ms !important/);
  });
});
