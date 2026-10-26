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
import { isAgentPersonalWorkspacePreview, isPersonalLayoutRequest } from './agent-personal-workspace-preview';
import { isAgentApprovalSummary } from './agent-approval-summary';
import { approvalSummaryFixture } from './agent-approval-summary-fixture';
const request = () => ({
  expectedRevision: 'missing',
  schemaVersion: 1,
  mode: 'custom',
  columns: 12,
  items: [{ group: 'cpu', x: 0, y: 0, w: 12, h: 8, collapsed: false, order: 0 }],
  historyDock: { collapsed: false, height: 12 }
});
const layout = () => ({
  kind: 'LAYOUT',
  monitorId: null,
  application: 'website',
  metricsName: null,
  favorite: null,
  expectedRevision: 'missing',
  request: request()
});
const favorite = () => ({
  kind: 'FAVORITE',
  monitorId: '9007199254740993',
  application: null,
  metricsName: 'cpu',
  favorite: true,
  expectedRevision: null,
  request: null
});
describe('personal workspace approval boundary', () => {
  it('retains exact large IDs and full native layout documents', () => {
    expect(isAgentPersonalWorkspacePreview(favorite())).toBe(true);
    expect(isAgentPersonalWorkspacePreview(layout())).toBe(true);
  });
  it('rejects unknown properties, unsafe identifiers and mismatched revisions', () => {
    expect(isAgentPersonalWorkspacePreview({ ...favorite(), command: 'echo fake' })).toBe(false);
    expect(isAgentPersonalWorkspacePreview({ ...favorite(), monitorId: Number('9007199254740993') })).toBe(false);
    expect(isAgentPersonalWorkspacePreview({ ...favorite(), metricsName: 'cpu\npassword=x' })).toBe(false);
    expect(
      isAgentPersonalWorkspacePreview({ ...layout(), expectedRevision: '00000000-0000-0000-0000-000000000001' })
    ).toBe(false);
    expect(isAgentPersonalWorkspacePreview({ ...layout(), request: null })).toBe(false);
  });
  it('rejects invalid native geometry, overlaps and duplicate groups', () => {
    const a = request();
    expect(isPersonalLayoutRequest({ ...a, columns: 48 })).toBe(false);
    expect(isPersonalLayoutRequest({ ...a, items: [...a.items, { ...a.items[0], group: 'memory', order: 1 }] })).toBe(
      false
    );
    expect(isPersonalLayoutRequest({ ...a, items: [...a.items, { ...a.items[0], y: 8, order: 1 }] })).toBe(false);
    expect(isPersonalLayoutRequest({ ...a, historyDock: { collapsed: false, height: 100 } })).toBe(false);
  });
  it('binds typed preview to summary operation and completeness', () => {
    const base = { ...approvalSummaryFixture(), targets: [], targetCount: 1, complete: true, personal: layout() };
    expect(isAgentApprovalSummary({ ...base, operation: 'CREATE' })).toBe(true);
    expect(isAgentApprovalSummary({ ...base, operation: 'DELETE' })).toBe(false);
    expect(isAgentApprovalSummary({ ...base, operation: 'CREATE', complete: false })).toBe(false);
    expect(isAgentApprovalSummary({ ...base, operation: 'CREATE', targetCount: 2 })).toBe(false);
  });
});
