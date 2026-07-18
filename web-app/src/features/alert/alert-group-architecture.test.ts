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

import api from './alert-group-api.ts?raw';
import commandController from './controller/use-alert-group-command-controller.ts?raw';
import controller from './controller/use-alert-group-controller.ts?raw';
import queryController from './controller/use-alert-group-query-controller.ts?raw';
import queryKeys from './controller/alert-group-query-keys.ts?raw';
import readController from './controller/use-alert-group-read-controller.ts?raw';
import model from './alert-group-model.ts?raw';
import state from './alert-group-state.ts?raw';
import writeProof from './alert-group-write-proof.ts?raw';

const modules = import.meta.glob('./alert-group-page.tsx', { eager: true, import: 'default', query: '?raw' });
const source = Object.values(modules)[0] as string;

function sourceLineCount(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}

describe('Alert Group architecture', () => {
  it('keeps response parsing in a named schema boundary', () => {
    expect(api).toContain("from './alert-group-schema'");
    expect(model).not.toMatch(/export function parseAlertGroup/);
    expect(model).not.toMatch(/function\s+(?:array|boolean|integer|number|object|record|stringArray|text)\s*\(/);
  });

  it('keeps TanStack, API, Router, App, and browser date ownership out of the page', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|alert-group-api|react-router|App\.useApp|Date\.parse|Intl\.DateTimeFormat/);
    expect(source).toContain("./controller/use-alert-group-controller");
  });

  it('keeps the route hook as composition over query, read, and command responsibilities', () => {
    expect(controller).toContain('useAlertGroupQueryController');
    expect(controller).toContain('useAlertGroupReadController');
    expect(controller).toContain('useAlertGroupCommandController');
    expect(controller).not.toMatch(/useQuery|useQueryClient|useSearchParams|App\.useApp|loadAlertGroup/);
    expect(queryController).toMatch(/useSearchParams/);
    expect(queryController).not.toMatch(/useQuery|App\.useApp|loadAlertGroup/);
    expect(readController).toMatch(/useQuery|useQueryClient/);
    expect(readController).toContain('resolveAlertGroupListState');
    expect(readController).not.toMatch(/page\.content\.length/);
    expect(readController).not.toMatch(/useSearchParams|App\.useApp|saveAlertGroup|deleteAlertGroup|updateAlertGroupEnabled/);
    expect(commandController).toMatch(/App\.useApp|saveAlertGroup|deleteAlertGroup|updateAlertGroupEnabled/);
    expect(commandController).toContain("from '../alert-group-write-proof'");
    expect(commandController).not.toMatch(/function\s+(?:prove|require)/);
    expect(commandController).not.toMatch(/useQuery|useQueryClient|useSearchParams/);
    expect(state).toContain('resolveAlertGroupListState');
    expect(state).not.toMatch(/@tanstack\/react-query|alert-group-api|use[A-Z]/);
    expect(writeProof).toMatch(/requireExactAlertGroupId|requireAlertGroupConvergence|proveAlertGroupMissing/);
  });

  it('delegates list cache identity to one Alert Group Query Key factory', () => {
    expect(readController).toContain('alertGroupQueryKeys.list(query)');
    expect(readController).not.toMatch(/queryKey\s*:\s*\[/);
    expect(queryKeys).toContain("const rootKey = ['alert-group-policies'] as const");
  });

  it('keeps every controller responsibility below the production limit', () => {
    for (const module of [controller, queryController, readController, commandController, queryKeys]) {
      expect(sourceLineCount(module)).toBeLessThanOrEqual(200);
    }
  });
});
