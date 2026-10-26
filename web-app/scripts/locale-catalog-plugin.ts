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

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

type Catalog = string | number | boolean | null | Catalog[] | { [key: string]: Catalog };
const normalizePath = (path: string) => path.replaceAll('\\', '/');
const sharedModule = 'virtual:hertzbeat-locale-values';
const resolvedSharedModule = `\0${sharedModule}`;

function collect(value: Catalog, counts: Map<string, number>) {
  if (typeof value === 'string') counts.set(value, (counts.get(value) ?? 0) + 1);
  else if (Array.isArray(value)) value.forEach(item => collect(item, counts));
  else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      collect(item, counts);
    }
  }
}

function emitString(value: string, shared: Map<string, number>) {
  const index = shared.get(value);
  return index === undefined ? JSON.stringify(value) : `strings[${index}]`;
}

function emit(value: Catalog, shared: Map<string, number>): string {
  if (typeof value === 'string') return emitString(value, shared);
  if (Array.isArray(value)) return `[${value.map(item => emit(item, shared)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .map(([key, item]) => `[${emitString(key, shared)}]:${emit(item, shared)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Compile only trusted, source-owned catalogs; never handles application/API data. */
export function localeCatalogPlugin(directory: string): Plugin {
  directory = `${normalizePath(resolve(directory))}/`;
  // Stable for this plugin instance, including build --watch: new values emit
  // inline while existing cached modules retain the same dictionary indices.
  let values: string[] | undefined;
  let shared: Map<string, number>;
  function initialize() {
    if (values) return;
    const counts = new Map<string, number>();
    for (const relative of readdirSync(directory, { recursive: true })
      .filter(name => String(name).endsWith('.json'))
      .sort()) {
      collect(JSON.parse(readFileSync(join(directory, String(relative)), 'utf8')) as Catalog, counts);
    }
    values = [...counts]
      .filter(([value, count]) => count >= 3 && Buffer.byteLength(value) >= 12)
      .sort(([a, ac], [b, bc]) => bc - ac || (a < b ? -1 : a > b ? 1 : 0))
      .map(([value]) => value);
    shared = new Map(values.map((value, index) => [value, index]));
  }
  return {
    name: 'locale-default-export',
    apply: 'build',
    enforce: 'post',
    resolveId(source) {
      if (source === sharedModule) return resolvedSharedModule;
    },
    load(id) {
      if (id !== resolvedSharedModule) return;
      initialize();
      return `export const values = Object.freeze(${JSON.stringify(values)});`;
    },
    transform(_code, id) {
      if (!id.endsWith('.json') || !normalizePath(resolve(id)).startsWith(directory)) return;
      initialize();
      const catalog = JSON.parse(readFileSync(id, 'utf8')) as Catalog;
      return {
        code: `import {values as strings} from ${JSON.stringify(sharedModule)};export default ${emit(catalog, shared)};`,
        map: null
      };
    }
  };
}
