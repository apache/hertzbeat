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

import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePut: vi.fn(), apiMessageDelete: vi.fn() }));
vi.mock('@/core/http/api-message', () => api);
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { readSignalDashboard, SIGNAL_DASHBOARD_VERSION } from '../model/signal-dashboard-record';
import { deleteSignalDashboard, loadSignalDashboards, saveSignalDashboard } from './signal-dashboard-api';
beforeEach(() => vi.clearAllMocks());
it('preserves a legacy record with invalid content for read-only inspection', async () => {
  const row = { dashboardKey: 'old', title: 'Old', layout: '{broken', widgets: '[]', version: 'v1', revision: 0 };
  api.apiMessageGet.mockResolvedValue([row]);
  expect(await loadSignalDashboards()).toEqual([row]);
  expect(api.apiMessagePut).not.toHaveBeenCalled();
});
it('always sends the selected native revision with a deletion', async () => {
  await deleteSignalDashboard('old', 3);
  expect(api.apiMessageDelete).toHaveBeenCalledWith('/api/signal/dashboard/old?revision=3');
  await expect(deleteSignalDashboard('old', -1)).rejects.toThrow();
  expect(api.apiMessageDelete).toHaveBeenCalledOnce();
});

const current = {
  dashboardKey: fixture.metadata.name,
  title: fixture.spec.display.name,
  version: SIGNAL_DASHBOARD_VERSION,
  document: fixture,
  revision: 3,
  layout: '[]',
  widgets: '[]',
  variables: '[]',
  panelMap: '{}'
};

it('creates using the document as sole content authority and no native revision', async () => {
  api.apiMessagePut.mockResolvedValue({ ...current, revision: 0 });
  await saveSignalDashboard(fixture);
  expect(api.apiMessagePut).toHaveBeenCalledWith('/api/signal/dashboard', {
    dashboardKey: fixture.metadata.name,
    version: SIGNAL_DASHBOARD_VERSION,
    document: fixture
  });
});

it('updates only the selected document and revision, never the GET fragments', async () => {
  const document = structuredClone(fixture);
  document.spec.display.name = 'Updated';
  api.apiMessagePut.mockResolvedValue({ ...current, document, revision: 4 });
  await saveSignalDashboard(document, current);
  expect(api.apiMessagePut).toHaveBeenCalledWith('/api/signal/dashboard', {
    dashboardKey: fixture.metadata.name,
    version: SIGNAL_DASHBOARD_VERSION,
    document,
    revision: 3
  });
});

it('propagates a conflict unchanged and never retries it', async () => {
  const conflict = Object.assign(new Error('Conflict'), { status: 409 });
  api.apiMessagePut.mockRejectedValue(conflict);
  await expect(saveSignalDashboard(fixture, current)).rejects.toBe(conflict);
  expect(api.apiMessagePut).toHaveBeenCalledOnce();
});

it('rejects invalid documents, unknown revisions and legacy replacement without sending a write', async () => {
  await expect(saveSignalDashboard({ ...fixture, datasource: 'external' })).rejects.toThrow();
  await expect(saveSignalDashboard(fixture, { ...current, revision: null })).rejects.toThrow();
  const populated = { ...current, document: null, version: 'v1', widgets: '[{"draftKey":"draft"}]' };
  await expect(saveSignalDashboard(fixture, populated)).rejects.toThrow();
  expect(api.apiMessagePut).not.toHaveBeenCalled();
});

it('only upgrades exactly the offered empty legacy document', async () => {
  const original = { ...current, document: null, version: 'v1', tags: 'ops,alpha' };
  const read = readSignalDashboard(original);
  if (read.kind !== 'legacy' || !read.document) throw new Error('Expected convertible fixture');
  api.apiMessagePut.mockResolvedValue({
    ...original,
    document: read.document,
    version: SIGNAL_DASHBOARD_VERSION,
    revision: 4
  });
  await saveSignalDashboard(read.document, original);
  expect(api.apiMessagePut).toHaveBeenCalledOnce();
  await expect(saveSignalDashboard(fixture, original)).rejects.toThrow();
  expect(api.apiMessagePut).toHaveBeenCalledOnce();
});

it.each([
  { dashboardKey: 'other' },
  { revision: 2 },
  { revision: 3 },
  { revision: 5 },
  { version: 'future' },
  { document: { ...fixture, kind: 'Unknown' } }
])('rejects a false successful write response: %j', patch => {
  api.apiMessagePut.mockResolvedValue({ ...current, revision: 4, ...patch });
  return expect(saveSignalDashboard(fixture, current)).rejects.toThrow();
});

it('cancels reads through the existing HTTP abort boundary and rejects duplicate keys', async () => {
  const controller = new AbortController();
  api.apiMessageGet.mockResolvedValue([current]);
  await loadSignalDashboards(controller.signal);
  expect(api.apiMessageGet).toHaveBeenCalledWith('/api/signal/dashboard', { signal: controller.signal });
  api.apiMessageGet.mockResolvedValue([current, current]);
  await expect(loadSignalDashboards()).rejects.toThrow('Duplicate');
});
