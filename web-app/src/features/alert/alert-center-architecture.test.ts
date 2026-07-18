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

import apiSource from './alert-api.ts?raw';
import controllerSource from './controller/use-alert-center-controller.ts?raw';
import modelSource from './alert-model.ts?raw';

const page = import.meta.glob('./alert-center-page.tsx', { eager: true, import: 'default', query: '?raw' });
const source = Object.values(page)[0] as string;

describe('Alert Center architecture', () => {
  it('keeps transport paths and response parsing in the API boundary', () => {
    expect(apiSource).toContain("from './alert-schema'");
    expect(apiSource).toContain('export function buildAlertListPath');
    expect(modelSource).not.toMatch(/export function parseAlert/);
    expect(modelSource).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
    expect(modelSource).not.toContain('/api/alerts/group');
  });

  it('keeps transport, TanStack query, URL ownership, and date parsing out of the page', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|alert-api|useSearchParams|Date\.parse|Intl\.DateTimeFormat/);
    expect(source).toContain("./controller/use-alert-center-controller");
  });

  it('keeps page presentation and Query Key identity in their owning modules', () => {
    expect(source).not.toMatch(/function (?:buildColumns|SummaryStrip|AlertResults)\b/);
    expect(source).toContain("./components/alert-center-toolbar");
    expect(source).toContain("./components/alert-center-summary");
    expect(source).toContain("./components/alert-center-results");
    expect(controllerSource).toContain('alertCenterQueryKeys.summary()');
    expect(controllerSource).toContain('alertCenterQueryKeys.groups(query)');
    expect(controllerSource).not.toMatch(/queryKey:\s*\[/);
  });

  it('does not update query draft state while rendering a URL change', () => {
    expect(controllerSource).not.toMatch(/if\s*\(queryChanged\)\s*setDraftState/);
  });

  it('keeps the page dependency surface limited to presentation, controller, and model modules', () => {
    const localImports = [...source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)].map(match => match[1]);
    expect(localImports.filter(path => ![
      './alert-center-page.module.css',
      './alert-management-nav',
      './components/alert-center-results',
      './components/alert-center-summary',
      './components/alert-center-toolbar',
      './controller/use-alert-center-controller'
    ].includes(path ?? ''))).toEqual([]);
  });
});
