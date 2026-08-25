/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import styles from './integration.module.css?raw';

describe('alert integration source-layout style contract', () => {
  it('keeps the official 240px source rail and flat document split', () => {
    expect(styles).toMatch(/\.layout\s*\{[\s\S]*?grid-template-columns:\s*240px minmax\(0, 1fr\)/);
    expect(styles).toMatch(/\.rail\s*\{[\s\S]*?border-inline-end:\s*1px solid/);
  });

  it('keeps a background-only selection cue without a left accent line', () => {
    expect(styles).toMatch(/\.source\s*\{[\s\S]*?border:\s*0/);
    expect(styles).toMatch(/\.sourceSelected\s*\{[\s\S]*?background:\s*var\(--ant-color-primary-bg\)/);
    expect(styles).not.toMatch(/\.sourceSelected\s*\{[\s\S]*?(?:box-shadow|border-inline-start):/);
  });

  it('shows compact readiness groups and a stable numbered workspace rail', () => {
    expect(styles).toMatch(/\.sourceGroupLabel\s*\{[\s\S]*?text-transform:\s*uppercase/);
    expect(styles).toMatch(/\.workspaceStep\s*\{[\s\S]*?grid-template-columns:\s*28px minmax\(0, 1fr\)/);
    expect(styles).toMatch(/\.stepNumber\s*\{[\s\S]*?border-radius:\s*50%/);
  });

  it('keeps guide sections flat instead of nesting bordered cards', () => {
    expect(styles).toMatch(/\.documentSection\s*\{[\s\S]*?padding:\s*0/);
    expect(styles).toMatch(/\.documentSection\s*\{[\s\S]*?border:\s*0/);
  });

  it('keeps long vendor scripts inspectable without turning the page into a code dump', () => {
    expect(styles).toMatch(/\.codeBlock\s*\{[\s\S]*?white-space:\s*pre/);
    expect(styles).toMatch(/\.snippet \.codeBlock\s*\{[\s\S]*?max-height:\s*520px/);
  });
});
