/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { expect, it } from 'vitest';
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { readDashboardImportFile } from './signal-dashboard-import';

function byteBoundaryDocument() {
  const document = parseHertzBeatDashboardDocument(fixture);
  const panel = structuredClone(document.spec.panels.logs!);
  panel.spec.display.name = 'é'.repeat(255);
  panel.spec.display.description = 'é'.repeat(512);
  document.spec.panels = {};
  document.spec.layouts[0].spec.items = [];
  for (let index = 0; index < 24; index++) {
    document.spec.panels['p' + index] = structuredClone(panel);
    document.spec.layouts[0].spec.items.push({
      x: 0,
      y: index * 8,
      width: 24,
      height: 8,
      content: { $ref: '#/spec/panels/p' + index }
    });
  }
  const bytes = () => new TextEncoder().encode(JSON.stringify(document)).length;
  for (const panel of Object.values(document.spec.panels)) {
    const query = panel.spec.queries[0].spec.plugin.spec.query;
    if (query.signal !== 'logs') throw new Error('Log fixture');
    query.search = 'a';
    const remaining = 65535 - bytes();
    query.search = 'é'.repeat(Math.min(512, Math.floor((remaining + 1) / 2)));
    if (65535 - bytes() <= 1) break;
  }
  document.spec.display.description += 'a'.repeat(65535 - bytes());
  expect(bytes()).toBe(65535);
  return document;
}
it('reimports readable standard JSON at the compact storage byte boundary', async () => {
  const document = byteBoundaryDocument();
  expect(parseHertzBeatDashboardDocument(document)).toEqual(document);
  const file = browserFile(JSON.stringify(document, null, 2));
  expect(file.size).toBeGreaterThan(65535);
  expect(parseHertzBeatDashboardDocument(JSON.parse(await readDashboardImportFile(file)))).toEqual(document);
});
it('retains the compact storage limit even though readable upload whitespace is allowed', async () => {
  const document = byteBoundaryDocument();
  document.spec.display.description += 'é';
  const file = browserFile(JSON.stringify(document, null, 2));
  const uploaded = await readDashboardImportFile(file);
  expect(() => parseHertzBeatDashboardDocument(JSON.parse(uploaded))).toThrow('UTF-8');
});
it('rejects oversized upload text before reading it', async () => {
  const file = browserFile(' '.repeat(256 * 1024 + 1));
  await expect(readDashboardImportFile(file)).rejects.toThrow('too large');
});

function browserFile(text: string): File {
  const file = new File([text], 'dashboard.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}
