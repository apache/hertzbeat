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

import api from './alert-inhibit-api.ts?raw';
import model from './alert-inhibit-model.ts?raw';

const modules = import.meta.glob('./alert-inhibit-page.tsx', { eager: true, import: 'default', query: '?raw' });
const source = Object.values(modules)[0] as string;

describe('Alert Inhibit architecture', () => {
  it('keeps response parsing in a named schema boundary', () => {
    expect(api).toContain("from './alert-inhibit-schema'");
    expect(api).toContain('function buildAlertInhibitListPath');
    expect(model).not.toMatch(/export function parseAlertInhibit/);
    expect(model).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
    expect(model).not.toContain('/api/alert/inhibits');
  });

  it('keeps query, transport, routing, notification, and date ownership out of the page', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|alert-inhibit-api|react-router|App\.useApp|Date\.parse|Intl\.DateTimeFormat/);
    expect(source).toContain('./controller/use-alert-inhibit-controller');
  });
});
