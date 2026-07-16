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

import { describe, expect, it } from 'vitest';

const requiredDirectories = ['api', 'model', 'components', 'pages'] as const;
const layerDirectories = [...requiredDirectories, 'hooks'] as const;
const allowedDependencies: Record<(typeof layerDirectories)[number], readonly string[]> = {
  api: ['api'],
  model: ['api', 'model'],
  hooks: ['api', 'model', 'hooks'],
  components: ['api', 'model', 'hooks', 'components'],
  pages: ['api', 'model', 'hooks', 'components', 'pages']
};
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const productionSources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});

describe('Explore feature boundaries', () => {
  it('keeps production source in explicit feature-local layers', () => {
    const paths = Object.keys(productionSources).filter(path => !path.includes('.test.'));
    expect(requiredDirectories.filter(directory => !paths.some(path => path.startsWith(`./${directory}/`)))).toEqual([]);
    expect(paths.filter(path => /^\.\/[^/]+$/.test(path) && path !== './index.ts')).toEqual([]);
  });

  it('keeps API transport independent from UI models and prevents direct component transport', () => {
    const violations = Object.entries(productionSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) => validateImports(path, source));
    expect(violations).toEqual([]);
  });
});

function validateImports(path: string, source: string) {
  const sourceDirectory = path.split('/')[1] as (typeof layerDirectories)[number];
  if (!layerDirectories.includes(sourceDirectory)) return [];
  const directTransport = sourceDirectory !== 'api'
    && (/\b(?:fetch|apiFetch|apiMessage(?:Get|Post|Put|Delete))\s*\(/.test(source) || /new\s+EventSource\s*\(/.test(source));
  const violations = directTransport ? [`${path} performs transport outside api`] : [];
  return violations.concat([...source.matchAll(importPattern)].flatMap(match => {
    const specifier = match[1];
    if (!specifier) return [];
    if (specifier.startsWith('@/core/http/')) return sourceDirectory === 'api' ? [] : [`${path} imports core transport`];
    if (!specifier.startsWith('.')) return [];
    const target = resolveFeaturePath(path, specifier);
    const targetDirectory = target.split('/')[1];
    if (!target.startsWith('./') || !targetDirectory) return [`${path} imports outside the feature`];
    return allowedDependencies[sourceDirectory].includes(targetDirectory)
      ? []
      : [`${path} imports ${targetDirectory}`];
  }));
}

function resolveFeaturePath(sourcePath: string, specifier: string) {
  const segments = sourcePath.split('/');
  segments.pop();
  for (const segment of specifier.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '.') segments.push(segment);
  }
  return segments.join('/');
}
