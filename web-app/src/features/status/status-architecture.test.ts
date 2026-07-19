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
const publicDirectories = [...requiredDirectories, 'controller'] as const;
const allowedDependencies: Record<(typeof publicDirectories)[number], readonly string[]> = {
  api: ['api', 'model'],
  model: ['model'],
  controller: ['api', 'model', 'controller'],
  components: ['model', 'components'],
  pages: ['model', 'controller', 'components', 'pages']
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

    expect(
      publicDirectories.filter(directory => !paths.some(path => path.startsWith(`./public/${directory}/`)))
    ).toEqual([]);
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

  it('owns public server-cache identity in one named factory', () => {
    const page = publicSources['./public/pages/public-status-page.tsx'] ?? '';
    const controller = publicSources['./public/controller/use-public-status-controller.ts'] ?? '';
    const queryKeys = publicSources['./public/controller/public-status-query-keys.ts'] ?? '';
    const queryOwners = Object.entries(publicSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) => (source.includes('useQuery(') ? [path] : []));

    expect(queryKeys).toContain('publicStatusQueryKeys');
    expect(queryOwners).toEqual(['./public/controller/use-public-status-controller.ts']);
    expect(controller.match(/\buseQuery\(/g)).toHaveLength(3);
    expect(controller).toContain('publicStatusQueryKeys.org()');
    expect(controller).toContain('publicStatusQueryKeys.components()');
    expect(controller).toContain('publicStatusQueryKeys.incidents()');
    expect(page).toContain('usePublicStatusController');
    expect(page).not.toMatch(/useQuery|publicStatusQueryKeys|public-status-api|@tanstack\/react-query/);
    expect(page).not.toMatch(/queryKey:\s*\[/);
  });
});

describe('Status Management boundaries', () => {
  const managementDirectories = [...requiredDirectories, 'controller'] as const;
  const managementDependencies: Record<(typeof managementDirectories)[number], readonly string[]> = {
    api: ['api', 'model'],
    model: ['model'],
    controller: ['api', 'model', 'controller'],
    components: ['model', 'components'],
    pages: ['model', 'controller', 'components', 'pages']
  };

  it('uses explicit feature-local layers with a dedicated controller', () => {
    const paths = Object.keys(managementSources).filter(path => !path.includes('.test.'));

    expect(
      managementDirectories.filter(directory => !paths.some(path => path.startsWith(`./management/${directory}/`)))
    ).toEqual([]);
    expect(paths.filter(path => path.slice('./management/'.length).includes('/') === false)).toEqual([]);
    expect(paths).toContain('./management/controller/use-status-incident-editor.ts');
    expect(paths.some(path => path.startsWith('./management/hooks/'))).toBe(false);
  });

  it('keeps transport in API and keeps the domain model independent from API', () => {
    const violations = Object.entries(managementSources)
      .filter(([path]) => !path.includes('.test.'))
      .flatMap(([path, source]) =>
        validateLayeredImports(path, source, './management/', managementDirectories, managementDependencies)
      );

    expect(violations).toEqual([]);
  });

  it('owns wire parsing in a named API schema instead of the domain model', () => {
    const api = managementSources['./management/api/status-management-api.ts'] ?? '';
    const schema = managementSources['./management/api/status-management-schema.ts'] ?? '';
    const contract = managementSources['./management/model/status-management-contract.ts'] ?? '';

    expect(api).toContain("from './status-management-schema'");
    expect(schema).toContain("from 'zod'");
    for (const parser of [
      'readRecord',
      'readRequiredString',
      'readNonnegativeInteger',
      'readPositiveInteger',
      'readIntegerInRange',
      'readOptionalNestedRecords'
    ]) {
      expect(contract).not.toContain(`function ${parser}`);
    }
    expect(contract).not.toContain('parseStatusOrg');
  });

  it('splits resource and transaction ownership behind one Query Key factory', () => {
    const controller = managementSources['./management/controller/use-status-management-controller.ts'] ?? '';
    const requiredOwners = [
      './management/controller/status-management-query-keys.ts',
      './management/controller/use-status-management-resources.ts',
      './management/controller/use-status-org-save.ts',
      './management/controller/use-status-component-transactions.ts',
      './management/controller/use-status-incident-transactions.ts'
    ];

    expect(requiredOwners.filter(path => !managementSources[path])).toEqual([]);
    expect(controller).not.toContain('useMutation');
    expect(controller).not.toContain('useQuery(');
    expect(controller).not.toContain('fetchQuery');
    expect(controller).not.toContain("['status-page-");
  });

  it('keeps the public status route explicit in the page and the heading presentational', () => {
    const page = managementSources['./management/pages/status-management-page.tsx'] ?? '';
    const header = managementSources['./management/components/status-management-header.tsx'] ?? '';
    const controller = managementSources['./management/controller/use-status-management-controller.ts'] ?? '';

    expect(page).toContain('<StatusManagementHeader publicStatusHref="/status" />');
    expect(page).not.toContain('<header');
    expect(page).not.toContain('Typography.');
    expect(page).not.toContain('<Button');
    expect(header).toContain('publicStatusHref');
    expect(header).not.toMatch(/['"]\/status['"]/);
    expect(controller).not.toMatch(/['"]\/status['"]/);
  });

  it('keeps incident transactions in the editor and history as pure presentation', () => {
    const editors = managementSources['./management/components/status-management-editors.tsx'] ?? '';
    const fields = managementSources['./management/components/status-incident-fields.tsx'] ?? '';
    const history = managementSources['./management/components/status-incident-history.tsx'] ?? '';

    expect(editors).toContain("from './status-incident-fields'");
    expect(editors).toContain("from './status-incident-history'");
    expect(editors).toContain('<StatusIncidentFields components={components} />');
    expect(editors).toContain('!isNew && incident.contents?.length ?');
    expect(editors).toContain('<StatusIncidentHistory contents={incident.contents} />');
    expect(editors).not.toContain('<List');
    expect(editors).toContain('Form.useForm');
    expect(editors).toContain('Form.useForm<StatusIncidentFormValue>()');
    expect(editors).not.toContain(
      'Form.useForm<{ name: string; state: number; componentIds: number[]; message: string }>'
    );
    expect(editors).toContain('buildIncidentPayload');
    expect(editors).toContain('timestamp: Date.now()');
    expect(editors).toContain('destroyOnHidden');
    expect(editors).toContain('confirmLoading={saving}');
    expect(editors).toContain("t(isNew ? 'statusManagement.newIncident' : 'statusManagement.updateIncident')");
    expect(editors).toContain('item.id == null ? [] : [item.id]');
    expect(history).toContain('const newestFirst = [...contents].sort');
    expect(history).toContain('new Date(item.timestamp).toLocaleString()');
    expect(history).toContain('t(incidentStateKey(item.state))');
    expect(history).not.toMatch(/Form|buildIncidentPayload|Date\.now|Modal|controller|status-management-api/);
    expect(fields).toContain('item.id == null ? [] : [{ value: item.id, label: item.name }]');
    expect(fields).toContain('export type StatusIncidentFormValue');
    expect(fields).toContain('t(incidentStateKey(value))');
    expect(fields).not.toMatch(/buildIncidentPayload|Date\.now|Modal|controller|status-management-api/);
  });

  it('exposes the management page through the Status root entry', () => {
    const entry = Object.values(entrySources)[0] ?? '';
    const router = Object.values(routerSources)[0] ?? '';

    expect(entry).toContain("export { StatusManagementPage } from './management/pages/status-management-page'");
    expect(router).not.toContain('@/features/status/management/');
  });
});

function validateImports(path: string, source: string) {
  return validateLayeredImports(path, source, './public/', publicDirectories, allowedDependencies);
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
  const directTransport =
    sourceDirectory !== 'api' && /\b(?:fetch|apiFetch|apiMessage(?:Get|Post|Put|Delete))\s*\(/.test(source);
  const violations = directTransport ? [`${path} performs transport outside api`] : [];

  return violations.concat(
    [...source.matchAll(importPattern)].flatMap(match => {
      const importKind = match[1] ?? '';
      const specifier = match[2];
      if (!specifier?.startsWith('.')) return [];
      const target = resolvePath(path, specifier);
      if (!target.startsWith(root)) return [`${path} imports outside ${root}`];
      const targetDirectory = target.slice(root.length).split('/')[0];
      if (!targetDirectory) return [`${path} has an unresolved relative import`];
      const apiModelTypeOnly =
        sourceDirectory === 'api' && targetDirectory === 'model' && importKind.startsWith('import type');
      if (apiModelTypeOnly) return [];
      return dependencies[sourceDirectory]?.includes(targetDirectory) ? [] : [`${path} imports ${targetDirectory}`];
    })
  );
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
