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
const sources = import.meta.glob('./**/*.{ts,tsx}', { eager: true, import: 'default', query: '?raw' });
describe('dashboard architecture', () => {
  it('keeps wire parsing in the API schema boundary', () => {
    expect(sources['./api/dashboard-api.ts']).toContain("from './dashboard-schema'");
    expect(sources['./model/dashboard-model.ts']).not.toMatch(/parseDashboard|parseAlertSummary/);
    expect(sources['./model/dashboard-model.ts'])
      .not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
  });

  it('uses explicit api/model/controller/components/pages layers', () => {
    const production = Object.keys(sources).filter(path => !path.includes('.test.'));
    for (const layer of ['api', 'model', 'controller', 'components', 'pages']) {
      expect(production.some(path => path.startsWith(`./${layer}/`))).toBe(true);
    }
    expect(production.filter(path => /^\.\/[^/]+\.(?:ts|tsx)$/.test(path) && path !== './index.ts')).toEqual([]);
  });
  it('keeps page and results presentation free of transport and TanStack', () => {
    for (const path of ['./pages/dashboard-page.tsx', './components/dashboard-results.tsx']) {
      expect(sources[path]).not.toMatch(/apiMessageGet|@tanstack\/react-query|useQuery|\.\.\/api\//);
    }
  });
});
