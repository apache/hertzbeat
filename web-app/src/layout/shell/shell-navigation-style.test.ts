/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import shellStyles from './hertzbeat-shell.module.css?raw';

describe('shell navigation visual hierarchy', () => {
  it('separates first-level product areas with spacing instead of repeated divider lines', () => {
    const siblingRule = shellStyles.match(
      /\.navigationBranch\[data-depth='0'\]\s*\+\s*\.navigationBranch\[data-depth='0'\]\s*\{[^}]*\}/
    )?.[0];

    expect(siblingRule).toBeDefined();
    expect(siblingRule).not.toMatch(/border(?:-top)?:/);
  });

  it('gives expanded first-level areas a restrained shared open state', () => {
    expect(shellStyles).toMatch(/\.navigationParentOpen\s*\{[^}]*background:\s*var\(--hb-nav-hover\)/);
  });

  it('marks the active destination with a line instead of a filled selection block', () => {
    const activeRule = shellStyles.match(/\.navigationLinkActive\s*\{[^}]*\}/)?.[0] ?? '';

    expect(activeRule).toMatch(/border-left-color:\s*var\(--hb-brand-accent\)/);
    expect(activeRule).toMatch(/background:\s*transparent/);
    expect(activeRule).not.toMatch(/background:\s*var\(--hb-nav-selected\)/);
  });
});
