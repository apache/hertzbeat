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

import appStyles from '@/app/styles.css?raw';
import shellStyles from '@/layout/shell/hertzbeat-shell.module.css?raw';

import signalStyles from './monitor-signal-view.module.css?raw';

describe('Monitor Signal View responsive contract', () => {
  it('contains the signal workspace inside the visible shell content at narrow viewports', () => {
    const body = appStyles.match(/body\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const content = shellStyles.match(/\.content\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    expect(body).toMatch(/min-width:\s*0/);
    expect(body).not.toMatch(/overflow(?:-x)?:\s*(hidden|clip)/);
    expect(shellStyles).toMatch(/--hb-shell-sidebar-width:\s*220px/);
    expect(shellStyles).toMatch(/\.shellCollapsed\s*\{[^}]*--hb-shell-sidebar-width:\s*48px/s);
    expect(content).toMatch(/min-width:\s*0/);
    expect(content).toMatch(/overflow-x:\s*auto/);
    expect(content).not.toMatch(/overflow-x:\s*(hidden|clip)/);
    expect(shellStyles).toMatch(/\.content\s*\{[^}]*padding:\s*22px 28px 40px/s);
    expect(signalStyles).toMatch(
      /@media \(max-width:\s*700px\)[\s\S]*\.workspace\s*\{[^}]*inline-size:\s*calc\(100vw - var\(--hb-shell-sidebar-width,\s*220px\) - 56px\)[^}]*max-inline-size:\s*100%/s
    );
  });
});
