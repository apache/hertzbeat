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

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, test } from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..');
const dependencyCruiser = join(projectRoot, 'node_modules', '.bin', 'depcruise');
const configuration = join(projectRoot, 'dependency-cruiser.config.cjs');
const temporaryProjects = [];

afterEach(() => {
  temporaryProjects.splice(0).forEach(directory => rmSync(directory, { force: true, recursive: true }));
});

test('accepts the documented inward dependency direction', () => {
  const fixture = createProject({
    'src/core/http/client.ts': 'export const client = true;',
    'src/features/instrumentation/api/instrumentation-api.ts': "import { client } from '@/core/http/client'; export const load = () => client;",
    'src/features/instrumentation/model/instrumentation-model.ts': 'export type Guide = { id: string };',
    'src/features/instrumentation/controller/instrumentation-controller.ts': "import { load } from '../api/instrumentation-api'; export const useGuide = load;",
    'src/features/instrumentation/components/instrumentation-guide.tsx': "import type { Guide } from '../model/instrumentation-model'; export const InstrumentationGuide = (_props: { guide: Guide }) => null;",
    'src/features/instrumentation/pages/instrumentation-page.tsx': "import { InstrumentationGuide } from '../components/instrumentation-guide'; export const InstrumentationPage = () => <InstrumentationGuide guide={{ id: 'guide' }} />;"
  });

  const result = cruise(fixture);

  assert.equal(result.status, 0, result.output);
});

test('rejects reverse layer dependencies and presentation transport access', () => {
  const fixture = createProject({
    'src/app/router.ts': 'export const router = true;',
    'src/shared/time/time.ts': 'export const now = 1;',
    'src/features/instrumentation/api/instrumentation-api.ts': 'export const load = true;',
    'src/features/instrumentation/controller/instrumentation-controller.ts': "import { router } from '@/app/router'; export const invalid = router;",
    'src/features/instrumentation/components/instrumentation-guide.tsx': "import { load } from '../api/instrumentation-api'; export const invalid = load;",
    'src/core/http/client.ts': "import { now } from '@/shared/time/time'; export const invalid = now;"
  });

  const result = cruise(fixture);

  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /no-feature-to-app-or-layout/);
  assert.match(result.output, /no-presentation-to-api/);
  assert.match(result.output, /no-core-to-outer-layers/);
});

function createProject(files) {
  const directory = mkdtempSync(join(tmpdir(), 'hertzbeat-architecture-'));
  temporaryProjects.push(directory);
  writeFile(directory, 'tsconfig.app.json', JSON.stringify({
    compilerOptions: {
      baseUrl: '.',
      jsx: 'react-jsx',
      paths: { '@/*': ['src/*'] }
    },
    include: ['src']
  }));
  Object.entries(files).forEach(([path, source]) => writeFile(directory, path, source));
  return directory;
}

function writeFile(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function cruise(cwd) {
  const result = spawnSync(dependencyCruiser, ['--config', configuration, '--output-type', 'err-long', 'src'], {
    cwd,
    encoding: 'utf8'
  });
  return {
    output: [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n'),
    status: result.status
  };
}
