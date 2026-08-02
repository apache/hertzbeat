/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import styles from './dashboard-start.module.css?raw';

describe('Dashboard start layout contract', () => {
  it('gives the reversed telemetry flow a shrink-safe track before its arrow and product node', () => {
    expect(styles).toMatch(
      /\.flow\[data-direction='reverse'\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+24px\s+auto/
    );
    expect(styles).toMatch(/\.entryMain\s*>\s*\*\s*\{[^}]*min-width:\s*0/);
    expect(styles).toMatch(/\.nodeGroup\s*\{[^}]*min-width:\s*0/);
    expect(styles).toMatch(/\.technologyNode\s*\{[^}]*min-width:\s*0/);
  });

  it('keeps identity headings semantically intact and uses brand tokens for entry actions', () => {
    expect(styles).toMatch(/\.entryIdentity\s+:global\(h2\.ant-typography\)\s*\{[^}]*word-break:\s*keep-all/);
    expect(styles).toMatch(/\.entryFooter\s+:global\(\.ant-btn-link\)\s*\{[^}]*color:\s*var\(--hb-brand-accent\)/);
    expect(styles).toMatch(/\.entryFooter\s+:global\(\.ant-btn-link:hover\)\s*\{[^}]*color:\s*var\(--hb-focus-ring\)/);
  });
});
