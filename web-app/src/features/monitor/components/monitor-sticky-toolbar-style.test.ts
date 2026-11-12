/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import toolbarCss from './monitor-list.module.css?raw';
import shellCss from '@/layout/shell/hertzbeat-shell.module.css?raw';

describe('monitor sticky toolbar scroll ownership', () => {
  it('pins the complete command band below the existing shell header', () => {
    expect(toolbarCss).toMatch(/\.stickyToolbar\s*\{[^}]*position:\s*sticky/s);
    expect(toolbarCss).toMatch(/top:\s*var\(--hb-shell-header-height,\s*52px\)/);
    expect(toolbarCss).toMatch(/background:\s*var\(--hb-bg-navigation\)/);
  });
  it('changes overflow only when the monitor command band is mounted', () => {
    expect(shellCss).toMatch(
      /\.content:has\(\[data-monitor-sticky-toolbar\]\)\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible/s
    );
    expect(shellCss).toMatch(
      /\.content:has\(\[data-monitor-sticky-toolbar\]\)\s+\[data-hb-operational-result-region\]\s*\{[^}]*overflow-x:\s*auto/s
    );
  });
  it('keeps wrapped mobile controls usable in a bounded band', () => {
    expect(toolbarCss).toMatch(
      /@media\s*\(max-width:\s*800px\)\s*\{\s*\.stickyToolbar\s*\{[^}]*max-height:\s*60dvh;[^}]*overflow-y:\s*auto/s
    );
  });
});
