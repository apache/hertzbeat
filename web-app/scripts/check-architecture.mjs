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
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'src');
const requiredDirectories = [
  'app',
  'core',
  'layout',
  'features',
  'shared',
  join('assets', 'i18n')
];
const forbiddenSegments = new Set(['compat', 'controllers', 'deprecated', 'legacy', 'view-models']);
const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const failures = [];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sourcePath(path) {
  return relative(sourceRoot, path).split(sep).join('/');
}

function isTest(path) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path);
}

function lineLimit(path) {
  const normalizedPath = sourcePath(path);
  if (/\/pages\/[^/]+\.[jt]sx?$/.test(normalizedPath)) return 300;
  if (/\/(?:api|components|hooks|model)\//.test(normalizedPath)) return 400;
  if (/\/index\.[jt]sx?$/.test(normalizedPath) && normalizedPath.startsWith('features/')) return 100;
  return 600;
}

function layer(path) {
  return sourcePath(path).split('/')[0];
}

function resolveImport(source, specifier) {
  if (specifier.startsWith('@/')) return join(sourceRoot, specifier.slice(2));
  if (specifier.startsWith('.')) return resolve(dirname(source), specifier);
  return null;
}

function targetLayer(path) {
  const normalizedPath = relative(sourceRoot, path);
  if (normalizedPath.startsWith('..')) return null;
  return normalizedPath.split(sep)[0];
}

function validateLayerImport(source, target, specifier) {
  const sourceLayer = layer(source);
  const destinationLayer = targetLayer(target);
  if (!destinationLayer) return;

  if (sourceLayer === 'core' && !['assets', 'core'].includes(destinationLayer)) {
    failures.push(`${sourcePath(source)}: core cannot import ${specifier}`);
    return;
  }

  if (sourceLayer === 'shared' && destinationLayer !== 'shared') {
    failures.push(`${sourcePath(source)}: shared cannot import ${specifier}`);
    return;
  }

  if (sourceLayer === 'features' && ['app', 'layout'].includes(destinationLayer)) {
    failures.push(`${sourcePath(source)}: features cannot import ${specifier}`);
  }

  if (sourceLayer !== 'features' || destinationLayer !== 'features') return;
  const sourceFeature = sourcePath(source).split('/')[1];
  const targetParts = relative(join(sourceRoot, 'features'), target).split(sep);
  const targetFeature = targetParts[0];
  if (sourceFeature === targetFeature) return;
  if (targetParts.length === 1 || targetParts[1] === 'index') return;
  failures.push(`${sourcePath(source)}: feature internals cannot import ${specifier}`);
}

for (const directory of requiredDirectories) {
  if (!existsSync(join(sourceRoot, directory))) {
    failures.push(`missing required directory: src/${directory.split(sep).join('/')}`);
  }
}

for (const path of walk(sourceRoot)) {
  if (!sourceExtensions.has(extname(path))) continue;
  const normalizedPath = sourcePath(path);
  const segments = normalizedPath.split('/');
  const forbidden = segments.find(segment => forbiddenSegments.has(segment));
  if (forbidden) failures.push(`${normalizedPath}: forbidden directory segment '${forbidden}'`);

  const source = readFileSync(path, 'utf8');
  if (!isTest(path)) {
    const lines = source.split(/\r?\n/).length;
    const limit = lineLimit(path);
    if (lines > limit) failures.push(`${normalizedPath}: ${lines} lines exceeds ${limit}`);
  }

  if (/\/(?:pages|components)\//.test(`/${normalizedPath}`) && /\bfetch\s*\(/.test(source)) {
    failures.push(`${normalizedPath}: pages and components cannot call fetch directly`);
  }

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier === 'next' || specifier.startsWith('next/') || specifier === 'mermaid') {
      failures.push(`${normalizedPath}: forbidden runtime import '${specifier}'`);
      continue;
    }
    const target = resolveImport(path, specifier);
    if (target) validateLayerImport(path, normalize(target), specifier);
  }
}

if (failures.length > 0) {
  console.error('Frontend architecture check failed:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Frontend architecture check passed.');
