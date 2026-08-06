/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import appStyles from '@/app/styles.css?raw';

import shellStyles from './hertzbeat-shell.module.css?raw';

describe('shell scrollbar style contract', () => {
  it('inherits the global theme-aware scrollbar without route-local overrides', () => {
    expect(appStyles).toMatch(/scrollbar-color:\s*var\(--hb-scrollbar-thumb\) transparent/);
    expect(appStyles).toMatch(/\*::-webkit-scrollbar\s*\{[^}]*width:\s*6px[^}]*height:\s*6px/s);
    expect(shellStyles).not.toMatch(/scrollbar-width|scrollbar-color|::-webkit-scrollbar/);
  });
});
