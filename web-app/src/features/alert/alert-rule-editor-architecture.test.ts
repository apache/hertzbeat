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

import commandSource from './controller/use-alert-rule-command-controller.ts?raw';
import controllerSource from './controller/use-alert-rule-editor-controller.ts?raw';
import previewSource from './controller/use-alert-rule-preview-controller.ts?raw';
import proofSource from './alert-rule-write-proof.ts?raw';

const modules = import.meta.glob('./alert-rule-editor-page.tsx', { eager: true, import: 'default', query: '?raw' });
const source = Object.values(modules)[0] as string;

function sourceLineCount(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}

describe('Alert Rule editor architecture', () => {
  it('keeps TanStack, API, Router, and notification ownership out of the page', () => {
    expect(source).not.toMatch(/@tanstack\/react-query|alert-rule-api|react-router|App\.useApp/);
    expect(source).toContain('./controller/use-alert-rule-editor-controller');
  });

  it('keeps bounded write proof outside the route controller', () => {
    expect(commandSource).toContain("from '../alert-rule-write-proof'");
    expect(controllerSource).not.toContain("from '../alert-rule-write-proof'");
    expect(controllerSource).not.toContain('loadAlertRules');
    expect(proofSource).toContain('maximumAlertRuleCreateProofPages');
    expect(sourceLineCount(controllerSource)).toBeLessThanOrEqual(200);
    expect(sourceLineCount(commandSource)).toBeLessThanOrEqual(200);
    expect(sourceLineCount(previewSource)).toBeLessThanOrEqual(200);
    expect(sourceLineCount(proofSource)).toBeLessThanOrEqual(200);
  });

  it('separates latest-preview and synchronous-save ownership from route composition', () => {
    expect(controllerSource).toContain('useAlertRulePreviewController');
    expect(controllerSource).toContain('useAlertRuleCommandController');
    expect(controllerSource).not.toMatch(/previewAlertRule|saveAlertRule|App\.useApp/);
    expect(previewSource).toMatch(/previewEpochRef|identity\.isCurrent/);
    expect(commandSource).toMatch(/ownerRef|identity\.isCurrent/);
  });

  it('delegates detail cache identity to the Alert Rule feature Query Key factory', () => {
    expect(controllerSource).toContain('alertRuleQueryKeys.detail(validId)');
    expect(controllerSource).not.toMatch(/queryKey:\s*\[/);
  });
});
