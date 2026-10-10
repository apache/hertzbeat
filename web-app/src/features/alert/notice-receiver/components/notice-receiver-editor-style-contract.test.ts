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

import css from './notice-receiver-editor.module.css?raw';

describe('notice receiver editor source geometry', () => {
  it('keeps a 7/12/5 horizontal field grid, source footer boundary, and responsive single-column fallback', () => {
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0,\s*7fr\)\s+minmax\(0,\s*12fr\)\s+minmax\(0,\s*5fr\)/);
    expect(css).toMatch(/\.modal\s+:global\(\.ant-modal-footer\)/);
    expect(css).toMatch(/border-top:\s*1px solid var\(--ant-color-border-secondary\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*800px\)/);
    expect(css).toMatch(/\.fieldRow\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  });
});
