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

const sources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});

describe('Token feature architecture', () => {
  it('keeps the route page limited to controller and section composition', () => {
    const page = String(sources['./pages/token-page.tsx'] ?? '');
    const list = String(sources['./components/token-list.tsx'] ?? '');

    expect(page).toContain('components/token-page-header');
    expect(page).toContain('components/token-list');
    expect(page).toContain('components/token-modals');
    expect(page).not.toMatch(/\b(?:Table|ColumnsType|App\.useApp)\b|tokenColumns|formatTokenTime|isTokenExpired/);
    expect(list).toContain('<Table<TokenResourceRecord>');
    expect(list).toContain('function tokenColumns');
    expect(list).toContain('App.useApp');
  });
});
