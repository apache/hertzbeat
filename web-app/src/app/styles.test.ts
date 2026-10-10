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

import appStyles from './styles.css?raw';

describe('application interaction styles', () => {
  it('allows every route to fit its viewport without clipping the page root', () => {
    const body = appStyles.match(/body\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    expect(body).toMatch(/min-width:\s*0/);
    expect(body).not.toMatch(/overflow(?:-x)?:\s*(hidden|clip)/);
  });

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

  it('uses one theme-aware thin scrollbar contract for every scroll container', () => {
    expect(appStyles).toMatch(/--hb-scrollbar-thumb:/);
    expect(appStyles).toMatch(/--hb-scrollbar-thumb-hover:/);
    expect(appStyles).toMatch(/scrollbar-width:\s*thin/);
    expect(appStyles).toMatch(/scrollbar-color:\s*var\(--hb-scrollbar-thumb\) transparent/);
    expect(appStyles).toMatch(/\*::-webkit-scrollbar\s*\{[^}]*width:\s*6px[^}]*height:\s*6px/s);
    expect(appStyles).toMatch(/\*::-webkit-scrollbar-thumb:hover\s*\{[^}]*var\(--hb-scrollbar-thumb-hover\)/s);
  });

  it('reserves the root scrollbar gutter so route content does not shift when its height changes', () => {
    expect(appStyles).toMatch(/html\s*\{[^}]*scrollbar-gutter:\s*stable/s);
  });

  it('keeps every Ant table empty row text-only and low chrome', () => {
    expect(appStyles).toMatch(
      /\.ant-table-wrapper\s+\.ant-table-placeholder\s+\.ant-table-cell\s*\{[^}]*padding-block:\s*var\(--hb-space-3\)/s
    );
    expect(appStyles).toMatch(
      /\.ant-table-wrapper\s+\.ant-table-placeholder\s+\.ant-empty-image\s*\{[^}]*display:\s*none/s
    );
    expect(appStyles).toMatch(
      /\.ant-table-wrapper\s+\.ant-table-placeholder\s+\.ant-empty-description\s*\{[^}]*color:\s*var\(--hb-text-secondary\)/s
    );
  });
});
