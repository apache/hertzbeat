// Licensed to the Apache Software Foundation (ASF) under one or more
// contributor license agreements. See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License. You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..', '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const releasedEnglish = 'home/versioned_docs/version-1.9.1';
const releasedChinese = 'home/i18n/zh-cn/docusaurus-plugin-content-docs/version-1.9.1';

test('1.9.1 is the default documentation version', () => {
  const versions = JSON.parse(read('home/versions.json'));
  assert.equal(versions[0], '1.9.1');
  assert.match(read('home/docusaurus.config.js'), /lastVersion:\s*['"]1\.9\.1['"]/);
});

test('1.9.1 account guidance describes Digest as opt-in', () => {
  for (const locale of [releasedEnglish, releasedChinese]) {
    const account = read(`${locale}/start/account-modify.md`);
    for (const token of ['Digest', 'sureness.auths', '401']) assert.ok(account.includes(token), `${locale}: ${token}`);
    assert.doesNotMatch(account, /answered with `401` and a `WWW-Authenticate: Digest` challenge/);
  }
  const account = read(`${releasedEnglish}/start/account-modify.md`);
  assert.match(account, /Digest is disabled by default/);
  assert.match(account, /If Digest is explicitly enabled/);
  for (const locale of [releasedEnglish, releasedChinese]) {
    const model = read(`${locale}/help/security_model.md`);
    assert.ok(model.includes('role: [admin]'));
    assert.ok(model.includes('admin_only_migration'));
    const migration = read(`${locale}/help/admin_only_migration.md`);
    for (const name of ['OTLP HTTP', 'Alertmanager']) {
      const row = migration.split('\n').find((line) => line.includes(name));
      assert.ok(row, `${locale}: ${name}`);
      assert.match(row, /admin(?:,|\/)user/);
    }
  }
  assert.match(read(`${releasedEnglish}/help/security_model.md`), /For management access, 1\.9\.1 requires the exact `admin` role/);
  assert.doesNotMatch(read(`${releasedEnglish}/help/security_model.md`), /removes the user and guest roles and keeps only admin|Planned for 1\.9\.1/);
});
