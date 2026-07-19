/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import source from './shell-header.tsx?raw';

describe('Shell header architecture', () => {
  it('keeps action side effects out of the composing header', () => {
    expect(source).toContain('useShellHeaderActionController');
    expect(source).not.toMatch(/logoutSession|persistSystemPreferences|useQueryClient|useSessionIdentityBoundary/);
  });

  it('delegates status and action presentation to named components', () => {
    expect(source).toContain('<ShellStatusSpine');
    expect(source).toContain('<ShellHeaderActions');
  });
});
