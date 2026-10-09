/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
