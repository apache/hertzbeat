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

describe('shell content layout contract', () => {
  it('contains narrow Explore header actions in the shared scroll spine without shrinking the status', () => {
    const narrow = shellStyles.match(/@media \(max-width:\s*700px\)(?<body>[\s\S]*?)(?=@media|$)/)?.groups?.body;
    expect(narrow).toContain(".shell:has([data-explore-workspace='true'], [data-explore-investigation='true'])");
    expect(narrow).toMatch(/\.headerSpine\s*>\s*:first-child\s*\{[^}]*flex:\s*0 0 auto/s);
    // Native keyboard proof verifies this shared spine, including reverse traversal.
    expect(narrow).toMatch(/\.headerSpine\s*\{[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/s);
    expect(narrow).toMatch(/\.headerActions\s*\{[^}]*flex:\s*none[^}]*min-width:\s*0/s);
    expect(narrow).toMatch(/\.headerActions\s*\{[^}]*scroll-padding-inline:\s*8px[^}]*touch-action:\s*pan-x/s);
    expect(narrow).toMatch(
      /\.headerActions\s*:is\(button, a\[href\], \[tabindex\]\)\s*\{[^}]*scroll-margin-inline:\s*8px/s
    );
    expect(narrow).toMatch(/\.headerActions\s*>\s*\*\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(narrow).toMatch(/\.headerAction,[\s\S]*\.accountButton\s*\{[^}]*height:\s*36px[^}]*min-width:\s*36px/s);
    expect(narrow).not.toContain('display: none');
    expect(narrow).not.toContain('.brandSlot');
  });

  it('keeps the complete narrow header spine reachable for ordinary operational routes', () => {
    const narrow = shellStyles.match(/@media \(max-width:\s*700px\)(?<body>[\s\S]*?)(?=@media|$)/)?.groups?.body;
    expect(narrow).toMatch(/\n {2}\.headerSpine\s*\{[^}]*overflow-x:\s*auto[^}]*scroll-padding-inline:\s*8px/s);
    expect(narrow).toMatch(/\n {2}\.headerSpine\s*>\s*\*\s*\{[^}]*flex:\s*0 0 auto/s);
    expect(narrow).toMatch(/\n {2}\.headerSpine\s*\{[^}]*touch-action:\s*pan-x[^}]*overscroll-behavior-x:\s*contain/s);
    expect(narrow).not.toContain('display: none');
  });

  it('gives focused investigations the same desktop and narrow gutters as compact workbenches', () => {
    expect(shellStyles).toMatch(
      /\.content:has\(\[data-explore-investigation='true'\]\)\s*\{\s*padding:\s*0 16px 16px/s
    );
    expect(shellStyles).toMatch(
      /@media \(max-width:\s*700px\)\s*\{[^}]*\.content:has\(\[data-explore-investigation='true'\]\)\s*\{\s*padding-inline:\s*12px/s
    );
    expect(shellStyles).toContain(".content:has([data-hb-operational-page][data-inset='compact'])");
  });

  it('does not turn shell wrappers into scroll containers around sticky navigation', () => {
    const shellRule = shellStyles.match(/\.shell\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const shellBodyRule = shellStyles.match(/\.shellBody\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const navigationRule = shellStyles.match(/\.navigation\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(shellRule).toMatch(/--hb-shell-header-height:\s*52px/);
    expect(shellRule).toMatch(/overflow-x:\s*clip/);
    expect(shellRule).not.toMatch(/overflow-x:\s*(auto|hidden)/);
    expect(shellBodyRule).toMatch(/overflow-x:\s*clip/);
    expect(shellBodyRule).toMatch(/overflow-y:\s*visible/);
    expect(shellBodyRule).not.toMatch(/overflow:\s*hidden/);
    expect(navigationRule).toMatch(/position:\s*sticky/);
    expect(navigationRule).toMatch(/top:\s*var\(--hb-shell-header-height\)/);
  });

  it('constrains route content before the shell fallback overflow boundary', () => {
    const contentRule = shellStyles.match(/\.content\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const routeChildRule = shellStyles.match(/:where\(\.content\s*>\s*\*\)\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(contentRule).toBeDefined();
    expect(contentRule).toMatch(/display:\s*grid/);
    expect(contentRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(contentRule).toMatch(/overflow-x:\s*auto/);
    expect(contentRule).not.toMatch(/overflow-x:\s*(hidden|clip)/);
    expect(routeChildRule).toMatch(/width:\s*100%/);
    expect(routeChildRule).toMatch(/min-width:\s*0/);
    expect(routeChildRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(contentRule).toMatch(/background:\s*var\(--hb-bg-navigation\)/);
  });

  it('treats the compact header as one continuous surface without a sidebar divider', () => {
    const shellRule = shellStyles.match(/\.shell\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const headerRule = shellStyles.match(/\.header\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const brandRule = shellStyles.match(/\.brandSlot\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(shellRule).toMatch(/--hb-shell-sidebar-width:\s*220px/);
    expect(headerRule).toMatch(/display:\s*flex/);
    expect(headerRule).not.toMatch(/grid-template-columns/);
    expect(brandRule).toMatch(/flex:\s*0\s+0\s+var\(--hb-shell-sidebar-width\)/);
    expect(brandRule).toMatch(/justify-content:\s*center/);
    expect(brandRule).not.toMatch(/border-right/);
  });
});
