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

const layeredDomains = [
  { directory: 'message-server', page: 'MessageServerPage' },
  { directory: 'token', page: 'TokenPage' },
  { directory: 'system-config', page: 'SystemConfigPage' },
  { directory: 'label', page: 'LabelPage' },
  { directory: 'object-store', page: 'ObjectStorePage' }
] as const;
const requiredDirectories = ['api', 'model', 'components', 'pages'] as const;
const layerDirectories = [...requiredDirectories, 'controller', 'hooks'] as const;
const allowedDependencies: Record<(typeof layerDirectories)[number], readonly string[]> = {
  api: ['api'],
  model: ['api', 'model'],
  controller: ['api', 'model', 'controller'],
  hooks: ['api', 'model', 'hooks'],
  components: ['api', 'model', 'hooks', 'components'],
  pages: ['api', 'model', 'controller', 'hooks', 'components', 'pages']
};
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
const productionSources = import.meta.glob('./**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw'
});
const routerSources = import.meta.glob('../../app/router.tsx', {
  eager: true,
  import: 'default',
  query: '?raw'
});

describe('Settings domain boundaries', () => {
  it.each(layeredDomains)('keeps $directory in explicit feature-local layers', domain => {
    const root = `./${domain.directory}/`;
    const paths = Object.keys(productionSources)
      .filter(path => path.startsWith(root) && !path.includes('.test.'));

    expect(requiredDirectories.filter(directory => !paths.some(path => path.startsWith(`${root}${directory}/`))))
      .toEqual([]);
    expect(paths.filter(path => path.slice(root.length).includes('/') === false && path !== `${root}index.ts`))
      .toEqual([]);
    expect(productionSources[`${root}index.ts`]).toContain(`export { ${domain.page} } from './pages/`);
  });

  it.each(layeredDomains)('keeps $directory transport and imports flowing inward', domain => {
    const root = `./${domain.directory}/`;
    const violations = Object.entries(productionSources)
      .filter(([path]) => path.startsWith(root) && !path.includes('.test.'))
      .flatMap(([path, source]) => validateImports(path, source, root));

    expect(violations).toEqual([]);
  });

  it.each(layeredDomains)('loads $directory through its public entry', domain => {
    const router = Object.values(routerSources)[0] ?? '';
    const publicEntry = new RegExp(`['"]@/features/settings/${domain.directory}['"]`);

    expect(router).toMatch(publicEntry);
    expect(router).not.toContain(`@/features/settings/${domain.directory}/pages/`);
  });

  it('keeps Label pages and components behind model and controller boundaries', () => {
    const labelSources = Object.entries(productionSources)
      .filter(([path]) => /^\.\/label\/(?:pages|components)\//.test(path) && !path.includes('.test.'));

    expect(labelSources.flatMap(([path, source]) => (
      source.includes("../api/") ? [path] : []
    ))).toEqual([]);
  });

  it('keeps Object Store pages behind its model and controller boundaries', () => {
    const pageSources = Object.entries(productionSources)
      .filter(([path]) => /^\.\/object-store\/pages\//.test(path) && !path.includes('.test.'));

    expect(pageSources.flatMap(([path, source]) => (
      source.includes('../api/') || source.includes('@tanstack/react-query') ? [path] : []
    ))).toEqual([]);
  });

  it('keeps System Config pages behind its model and controller boundaries', () => {
    const pageSources = Object.entries(productionSources)
      .filter(([path]) => /^\.\/system-config\/pages\//.test(path) && !path.includes('.test.'));

    expect(pageSources.flatMap(([path, source]) => (
      source.includes('../api/') || source.includes('@tanstack/react-query') ? [path] : []
    ))).toEqual([]);
  });

  it('keeps Token pages behind its model and controller boundaries', () => {
    const pageSources = Object.entries(productionSources)
      .filter(([path]) => /^\.\/token\/pages\//.test(path) && !path.includes('.test.'));

    expect(pageSources.flatMap(([path, source]) => (
      source.includes('../api/') || source.includes('@tanstack/react-query') ? [path] : []
    ))).toEqual([]);
  });

  it('keeps one-time Token plaintext out of Refine mutation hooks', () => {
    const controllerSources = Object.entries(productionSources)
      .filter(([path]) => /^\.\/token\/controller\//.test(path) && !path.includes('.test.'));

    expect(controllerSources.flatMap(([path, source]) => (
      /\buse(?:Create|Update|CustomMutation)\b/.test(source) ? [path] : []
    ))).toEqual([]);
  });
});

function validateImports(path: string, source: string, root: string) {
  const sourceDirectory = path.slice(root.length).split('/')[0] as (typeof layerDirectories)[number];
  if (!layerDirectories.includes(sourceDirectory)) return [];
  const directTransport = sourceDirectory !== 'api'
    && /\b(?:fetch|apiFetch|apiMessage(?:Get|Post|Put|Delete))\s*\(/.test(source);
  const violations = directTransport ? [`${path} performs transport outside api`] : [];

  return violations.concat([...source.matchAll(importPattern)].flatMap(match => {
    const specifier = match[1];
    if (!specifier) return [];
    if (specifier.startsWith('@/core/http/')) {
      return sourceDirectory === 'api' ? [] : [`${path} imports core transport`];
    }
    if (!specifier.startsWith('.')) return [];
    const target = resolveDomainPath(path, specifier);
    if (!target.startsWith(root)) return [`${path} imports outside ${root}`];
    const targetDirectory = target.slice(root.length).split('/')[0];
    if (!targetDirectory) return [`${path} has an unresolved relative import`];
    return allowedDependencies[sourceDirectory].includes(targetDirectory)
      ? []
      : [`${path} imports ${targetDirectory}`];
  }));
}

function resolveDomainPath(sourcePath: string, specifier: string) {
  const segments = sourcePath.split('/');
  segments.pop();
  for (const segment of specifier.split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '.') segments.push(segment);
  }
  return segments.join('/');
}
