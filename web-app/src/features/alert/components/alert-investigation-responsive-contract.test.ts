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

import styles from './alert-investigation-view.module.css?raw';

describe('Alert investigation responsive contract', () => {
  it('releases the global shell minimum only for the focused alert route', () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*700px\)[\s\S]*:global\(body:has\(\[data-alert-investigation='true'\]\)\)\s*\{[^}]*min-width:\s*0/s
    );
  });

  it('contains wide evidence locally and simplifies secondary shell status at 680px', () => {
    expect(styles).toMatch(/\.tableScroll\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto/s);
    expect(styles).toMatch(/\.signalBody\s*\{[^}]*max-width:\s*100%[^}]*overflow:\s*hidden/s);
    expect(styles).toMatch(
      /body:has\(\[data-alert-investigation='true'\]\)[\s\S]*shell-time-policy[\s\S]*shell-status-greptime[\s\S]*shell-status-collector[\s\S]*display:\s*none/s
    );
  });
});
