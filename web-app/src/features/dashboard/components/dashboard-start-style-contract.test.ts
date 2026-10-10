/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import styles from './dashboard-start.module.css?raw';

describe('Dashboard start layout contract', () => {
  it('uses one divider between data paths instead of outlining every region', () => {
    const entryRule = styles.match(/\.entry\s*\{[^}]*\}/)?.[0] ?? '';
    const entrySiblingRule = styles.match(/\.entry\s*\+\s*\.entry\s*\{[^}]*\}/)?.[0] ?? '';
    const outcomeRule = styles.match(/\.outcome\s*\{[^}]*\}/)?.[0] ?? '';
    const footerRule = styles.match(/\.entryFooter\s*\{[^}]*\}/)?.[0] ?? '';

    expect(entryRule).not.toMatch(/border/);
    expect(entrySiblingRule).toMatch(/border-block-start:\s*1px solid var\(--hb-border-subtle\)/);
    expect(entryRule).not.toMatch(/border-radius:/);
    expect(entryRule).not.toMatch(/background:/);
    expect(styles).toMatch(/\.startSurface\s*\{[^}]*--dashboard-entry-identity-min:\s*170px/);
    expect(styles).toMatch(/\.entryMain\s*\{[^}]*column-gap:\s*var\(--dashboard-entry-column-gap\)/);
    expect(styles).toMatch(/\.entryMain\s*\{[^}]*minmax\(var\(--dashboard-entry-outcome-min\),\s*1fr\)/);
    expect(outcomeRule).not.toMatch(/border/);
    expect(footerRule).not.toMatch(/border/);
    expect(styles).toMatch(/\.outcome\s+:global\(p\.ant-typography\)\s*\{[^}]*text-wrap:\s*balance/);
    expect(styles).not.toMatch(/\.(decision|convergence)\s*\{/);
  });

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
