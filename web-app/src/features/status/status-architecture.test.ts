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
const allowedDependencies: Record<(typeof requiredDirectories)[number], readonly string[]> = {
  api: ['api'],
  model: ['api', 'model'],
  components: ['api', 'model', 'components'],
  pages: ['api', 'model', 'components', 'pages']
};
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const publicSources = import.meta.glob('./public/**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});
const entrySources = import.meta.glob('./index.ts', { eager: true, import: 'default', query: '?raw' });
const routerSources = import.meta.glob('../../app/router.tsx', { eager: true, import: 'default', query: '?raw' });

describe('Public Status boundaries', () => {
  it('uses explicit feature-local layers without empty hooks', () => {
    const paths = Object.keys(publicSources).filter(path => !path.includes('.test.'));

    expect(requiredDirectories.filter(directory => !paths.some(path => path.startsWith(`./public/${directory}/`))))
      .toEqual([]);
    expect(paths.filter(path => path.slice('./public/'.length).includes('/') === false)).toEqual([]);
    expect(paths.some(path => path.startsWith('./public/hooks/'))).toBe(false);
  });

  it('keeps transport in API and imports flowing inward', () => {
    const violations = Object.entries(publicSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) => validateImports(path, source));

    expect(violations).toEqual([]);
  });

  it('exposes the page at the Status root and routes only through that entry', () => {
    const entry = Object.values(entrySources)[0] ?? '';
    const router = Object.values(routerSources)[0] ?? '';

    expect(entry).toContain("export { PublicStatusPage } from './public/pages/public-status-page'");
    expect(router).toMatch(/['"]@\/features\/status['"]/);
    expect(router).not.toContain('@/features/status/public/');
  });
});

function validateImports(path: string, source: string) {
  const root = './public/';
  const sourceDirectory = path.slice(root.length).split('/')[0] as (typeof requiredDirectories)[number];
  const directTransport = sourceDirectory !== 'api'
    && /\b(?:fetch|apiFetch|apiMessage(?:Get|Post|Put|Delete))\s*\(/.test(source);
  const violations = directTransport ? [`${path} performs transport outside api`] : [];

  return violations.concat([...source.matchAll(importPattern)].flatMap(match => {
    const specifier = match[1];
    if (!specifier?.startsWith('.')) return [];
    const target = resolvePath(path, specifier);
    if (!target.startsWith(root)) return [`${path} imports outside public`];
    const targetDirectory = target.slice(root.length).split('/')[0];
    if (!targetDirectory) return [`${path} has an unresolved relative import`];
    return allowedDependencies[sourceDirectory].includes(targetDirectory)
      ? []
      : [`${path} imports ${targetDirectory}`];
  }));
}

function resolvePath(sourcePath: string, specifier: string) {
  const segments = sourcePath.split('/');
  segments.pop();
  for (const segment of specifier.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '.') segments.push(segment);
  }
  return segments.join('/');
}
