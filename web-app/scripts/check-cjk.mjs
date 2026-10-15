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

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'src');
const checkedExtensions = new Set(['.ts', '.tsx', '.css']);
const hanScript = /\p{Script=Han}/u;
const failures = [];

function walk(directory) {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const path of walk(sourceRoot)) {
  if (!checkedExtensions.has(extname(path))) continue;
  const source = readFileSync(path, 'utf8');
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (hanScript.test(line)) {
      const displayPath = relative(root, path).split(sep).join('/');
      failures.push(`${displayPath}:${index + 1}`);
    }
  });
}

if (failures.length > 0) {
  console.error('Localized CJK copy must live in locale resources:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('CJK source scan passed.');
