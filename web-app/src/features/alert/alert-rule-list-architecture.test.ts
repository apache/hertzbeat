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
import controllerSource from './controller/use-alert-rule-list-controller.ts?raw';
import readControllerSource from './controller/use-alert-rule-list-read-controller.ts?raw';

const pageModules = import.meta.glob('./alert-rule-list-page.tsx', { eager: true, import: 'default', query: '?raw' });
const pageSource = Object.values(pageModules)[0] as string;
const presentationModules = import.meta.glob(['./alert-rule-list-page.tsx', './components/alert-rule-list-*.tsx'], {
  eager: true,
  import: 'default',
  query: '?raw'
});
const presentationSource = Object.values(presentationModules).join('\n');

function sourceLineCount(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
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
    expect(presentationSource).not.toMatch(
      /@tanstack\/react-query|alert-rule-api|react-router|App\.useApp|Date\.parse|Intl\.DateTimeFormat/
    );
    expect(pageSource).toContain('./controller/use-alert-rule-list-controller');
  });

  it('delegates list cache identity to the Alert Rule feature Query Key factory', () => {
    expect(readControllerSource).toContain('alertRuleQueryKeys.list(query)');
    expect(`${controllerSource}\n${readControllerSource}`).not.toMatch(/const\s+listKey\s*=/);
    expect(`${controllerSource}\n${readControllerSource}`).not.toMatch(/queryKey:\s*\[/);
  });
});
