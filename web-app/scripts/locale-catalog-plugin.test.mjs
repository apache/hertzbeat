/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
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

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { transformWithOxc } from 'vite';

const source = readFileSync(new URL('./locale-catalog-plugin.ts', import.meta.url), 'utf8');
const compiled = await transformWithOxc(source, 'locale-catalog-plugin.ts', { target: 'es2023' });
const moduleUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const { localeCatalogPlugin } = await import(moduleUrl(compiled.code));

async function evaluate(plugin, code) {
  const pool = await import(moduleUrl(plugin.load(plugin.resolveId('virtual:hertzbeat-locale-values'))));
  assert.equal(Object.isFrozen(pool.values), true);
  const pooled = moduleUrl(`export const values=${JSON.stringify(pool.values)};`);
  return (
    await import(moduleUrl(code.replace(JSON.stringify('virtual:hertzbeat-locale-values'), JSON.stringify(pooled))))
  ).default;
}

test('catalog compilation preserves escaped text, arrays, nulls and own prototype-like keys', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'hzb-catalog-'));
  try {
    const data = JSON.parse('{"__proto__":{"polluted":"only-data"}}');
    data.longSharedCatalogKey = 'Shared multilingual text: 日本語 "quoted" \n <script> & {{count}}';
    data.nested = [false, null, 42, { longSharedCatalogKey: data.longSharedCatalogKey }];
    for (const name of ['one', 'two', 'three']) writeFileSync(join(directory, `${name}.json`), JSON.stringify(data));
    const plugin = localeCatalogPlugin(directory);
    const generated = plugin.transform('', join(directory, 'one.json')).code;
    assert.match(generated, /strings\[/);
    const output = await evaluate(plugin, generated);
    assert.deepEqual(output, data);
    assert.equal(Object.getPrototypeOf(output), Object.prototype);
    assert.equal(Object.hasOwn(output, '__proto__'), true);
    assert.equal(plugin.transform('', join(directory, '..', 'outside.json')), undefined);
    assert.equal(plugin.transform('', join(directory, 'one.json') + '?raw'), undefined);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('watch rebuilds retain dictionary indices for cached modules and emit new values literally', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'hzb-catalog-watch-'));
  try {
    const old = { longSharedCatalogKey: 'Shared original translation for all catalogs' };
    for (const name of ['one', 'two', 'three']) writeFileSync(join(directory, `${name}.json`), JSON.stringify(old));
    const plugin = localeCatalogPlugin(directory);
    const cached = plugin.transform('', join(directory, 'two.json')).code;
    const before = plugin.load(plugin.resolveId('virtual:hertzbeat-locale-values'));
    const changed = { longSharedCatalogKey: 'A new translation that was not in the initial dictionary', extra: 'new' };
    writeFileSync(join(directory, 'one.json'), JSON.stringify(changed));
    const updated = plugin.transform('', join(directory, 'one.json')).code;
    assert.equal(plugin.load(plugin.resolveId('virtual:hertzbeat-locale-values')), before);
    assert.deepEqual(await evaluate(plugin, cached), old);
    assert.deepEqual(await evaluate(plugin, updated), changed);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
