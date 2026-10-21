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

import { expect, it } from 'vitest';
import { readSignalDashboard } from './signal-dashboard-record';

const legacy = {
  dashboardKey: 'old-dashboard',
  title: 'Old dashboard',
  description: 'Preserve me',
  tags: 'ops,alpha',
  layout: '[]',
  widgets: '[]',
  variables: '[]',
  panelMap: '{}',
  version: 'v1',
  revision: 0
};
it('offers only a lossless empty legacy conversion without mutating any original fragment', () => {
  const result = readSignalDashboard(legacy);
  expect(result.kind).toBe('legacy');
  if (result.kind === 'legacy')
    expect(result.document?.spec.display).toEqual({ name: 'Old dashboard', description: 'Preserve me' });
  expect(legacy.widgets).toBe('[]');
});
it('retains a nonempty unknown legacy composition without offering an unrelated replacement document', () => {
  const result = readSignalDashboard({ ...legacy, widgets: '[{"unknown":"meaning"}]' });
  expect(result).toMatchObject({ kind: 'legacy', document: undefined });
});

it.each([
  { widgets: '[{"draftKey":"private-draft"}]' },
  { layout: '[{"x":0}]' },
  { variables: '[{"kind":"custom"}]' },
  { panelMap: '{"panel":"draft"}' },
  { version: 'v2' },
  { title: ' padded ' },
  { tags: 'ops, alpha' },
  { tags: 'ops,,alpha' },
  { tags: 'ops,ops' },
  { dashboardKey: 'old:key' },
  { layout: '{broken' },
  { layout: undefined },
  { widgets: undefined }
])('preserves unsupported legacy content without conversion: %j', patch => {
  const original = { ...legacy, ...patch };
  const snapshot = structuredClone(original);
  const read = readSignalDashboard(original);
  expect(read).toEqual({ kind: 'legacy', original, document: undefined });
  expect(original).toEqual(snapshot);
});

it('retains an unsupported document and its old raw fragments for export', () => {
  const original = { ...legacy, version: 'future', document: { kind: 'Unknown' } };
  expect(readSignalDashboard(original)).toEqual({ kind: 'unavailable', original, reason: 'unsupportedDocument' });
});
