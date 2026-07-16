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
const importPattern = /(import\s+type\s+(?:\{[\s\S]*?\}|[\w$]+)\s+from\s+|from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const publicSources = import.meta.glob('./public/**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});
const managementSources = import.meta.glob('./management/**/*.{ts,tsx}', {
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

describe('Status Management boundaries', () => {
  const managementDirectories = [...requiredDirectories, 'hooks'] as const;
  const managementDependencies: Record<(typeof managementDirectories)[number], readonly string[]> = {
    api: ['api', 'model'],
    model: ['model'],
    hooks: ['api', 'model', 'hooks'],
    components: ['api', 'model', 'hooks', 'components'],
    pages: ['api', 'model', 'hooks', 'components', 'pages']
  };

  it('uses explicit feature-local layers with a real mutation hook', () => {
    const paths = Object.keys(managementSources).filter(path => !path.includes('.test.'));

    expect(managementDirectories.filter(directory => !paths.some(path => path.startsWith(`./management/${directory}/`))))
      .toEqual([]);
    expect(paths.filter(path => path.slice('./management/'.length).includes('/') === false)).toEqual([]);
  });

  it('keeps transport in API and keeps the domain model independent from API', () => {
    const violations = Object.entries(managementSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) => validateLayeredImports(
        path,
        source,
        './management/',
        managementDirectories,
        managementDependencies
      ));

    expect(violations).toEqual([]);
  });

  it('exposes the management page through the Status root entry', () => {
    const entry = Object.values(entrySources)[0] ?? '';
    const router = Object.values(routerSources)[0] ?? '';

    expect(entry).toContain("export { StatusManagementPage } from './management/pages/status-management-page'");
    expect(router).not.toContain('@/features/status/management/');
  });
});

function validateImports(path: string, source: string) {
  return validateLayeredImports(path, source, './public/', requiredDirectories, allowedDependencies);
}

function validateLayeredImports(
  path: string,
  source: string,
  root: string,
  directories: readonly string[],
  dependencies: Record<string, readonly string[]>
) {
  const sourceDirectory = path.slice(root.length).split('/')[0] ?? '';
  if (!directories.includes(sourceDirectory)) return [`${path} has an unknown layer`];
  const directTransport = sourceDirectory !== 'api'
    && /\b(?:fetch|apiFetch|apiMessage(?:Get|Post|Put|Delete))\s*\(/.test(source);
  const violations = directTransport ? [`${path} performs transport outside api`] : [];

  return violations.concat([...source.matchAll(importPattern)].flatMap(match => {
    const importKind = match[1] ?? '';
    const specifier = match[2];
    if (!specifier?.startsWith('.')) return [];
    const target = resolvePath(path, specifier);
    if (!target.startsWith(root)) return [`${path} imports outside ${root}`];
    const targetDirectory = target.slice(root.length).split('/')[0];
    if (!targetDirectory) return [`${path} has an unresolved relative import`];
    const apiModelTypeOnly = sourceDirectory === 'api'
      && targetDirectory === 'model'
      && importKind.startsWith('import type');
    if (apiModelTypeOnly) return [];
    return dependencies[sourceDirectory]?.includes(targetDirectory)
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
