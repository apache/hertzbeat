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

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

import bundleLimits from './bundle-limits.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const manifestPath = join(dist, '.vite', 'manifest.json');
const chunkRawLimit = bundleLimits.chunkWarningKilobytes * 1024;
const shellGzipLimit = bundleLimits.shellGzipBytes;
const totalRawLimit = bundleLimits.totalJavaScriptBytes;

if (!existsSync(manifestPath)) {
  console.error('Bundle budget failed: dist manifest is missing. Run pnpm build first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const entry = Object.values(manifest).find(item => item?.isEntry);
if (!entry?.file) {
  console.error('Bundle budget failed: application entry is missing from the Vite manifest.');
  process.exit(1);
}

const entryPath = join(dist, entry.file);
const entryRaw = statSync(entryPath).size;
const entryGzip = gzipSync(readFileSync(entryPath)).byteLength;
const assetDirectory = join(dist, 'assets');
const javaScriptAssets = readdirSync(assetDirectory)
  .filter(file => file.endsWith('.js'))
  .map(file => ({ file, size: statSync(join(assetDirectory, file)).size }));
const totalRaw = javaScriptAssets.reduce((total, asset) => total + asset.size, 0);
const failures = [];

javaScriptAssets
  .filter(asset => asset.size > chunkRawLimit)
  .forEach(asset => failures.push(`chunk ${asset.file} is ${asset.size} bytes; limit is ${chunkRawLimit}`));
if (entryGzip > shellGzipLimit) {
  failures.push(`shell ${entryGzip} bytes gzip exceeds ${shellGzipLimit}`);
}
if (totalRaw > totalRawLimit) {
  failures.push(`total JavaScript ${totalRaw} bytes exceeds ${totalRawLimit}`);
}

if (failures.length > 0) {
  console.error('Bundle budget failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Bundle budget passed: ${basename(entry.file)} is ${entryRaw} bytes raw / ${entryGzip} bytes gzip; ` +
    `total JavaScript is ${totalRaw} bytes.`
);
