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

import apiSource from './alert-rule-api.ts?raw';
import modelSource from './alert-rule-model.ts?raw';
import schemaSource from './alert-rule-schema.ts?raw';

const modules = import.meta.glob('./alert-rule-list-page.tsx', { eager: true, import: 'default', query: '?raw' });
const source = Object.values(modules)[0] as string;

function sourceLineCount(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}

describe('Alert Rule list architecture', () => {
  it('keeps paths and detail/page/preview parsing in the API schema boundary', () => {
    expect(apiSource).toContain("from './alert-rule-schema'");
    expect(apiSource).toContain('export function buildAlertRuleListPath');
    expect(apiSource).not.toMatch(/Array\.isArray\(response\)|typeof item/);
    expect(modelSource).not.toMatch(/export function parseAlertRule/);
    expect(modelSource).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
    expect(modelSource).not.toContain('/api/alert/defines');
    expect(sourceLineCount(apiSource)).toBeLessThanOrEqual(250);
    expect(sourceLineCount(modelSource)).toBeLessThanOrEqual(250);
    expect(sourceLineCount(schemaSource)).toBeLessThanOrEqual(250);
  });

  it('keeps query, API, Router, notification, and browser date ownership out of the page', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|alert-rule-api|react-router|App\.useApp|Date\.parse|Intl\.DateTimeFormat/);
    expect(source).toContain('./controller/use-alert-rule-list-controller');
  });
});
