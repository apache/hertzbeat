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

  it('animates accordion height and chevrons while respecting reduced-motion preferences', () => {
    expect(shellStyles).toMatch(
      /\.navigationChildrenMotion\s*\{[^}]*grid-template-rows:\s*0fr[^}]*transition:[^}]*grid-template-rows/s
    );
    expect(shellStyles).toMatch(/\.navigationChildrenMotion\[data-open='true'\]\s*\{[^}]*grid-template-rows:\s*1fr/s);
    expect(shellStyles).toMatch(/\.navigationChevron[^}]*transition:[^}]*transform/s);
    expect(shellStyles).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.navigationChildrenMotion[\s\S]*transition-duration:\s*0\.01ms/
    );
  });

  it('marks the active destination with a line instead of a filled selection block', () => {
    const activeRule = shellStyles.match(/\.navigationLinkActive\s*\{[^}]*\}/)?.[0] ?? '';

    expect(activeRule).toMatch(/border-left-color:\s*var\(--hb-brand-accent\)/);
    expect(activeRule).toMatch(/background:\s*transparent/);
    expect(activeRule).not.toMatch(/background:\s*var\(--hb-nav-selected\)/);
  });
});
