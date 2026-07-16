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

const page = import.meta.glob('./alert-center-page.tsx', { eager: true, import: 'default', query: '?raw' });
const source = Object.values(page)[0] as string;

describe('Alert Center architecture', () => {
  it('keeps transport, TanStack query, URL ownership, and date parsing out of the page', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|alert-api|useSearchParams|Date\.parse|Intl\.DateTimeFormat/);
    expect(source).toContain("./controller/use-alert-center-controller");
  });

  it('keeps the page dependency surface limited to presentation, controller, and model modules', () => {
    const localImports = [...source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)].map(match => match[1]);
    expect(localImports.filter(path => ![
      './alert-center-page.module.css',
      './alert-management-nav',
      './alert-model',
      './controller/use-alert-center-controller'
    ].includes(path ?? ''))).toEqual([]);
  });
});
