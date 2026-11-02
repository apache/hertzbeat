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
const english = 'home/docs';
const chinese = 'home/i18n/zh-cn/docusaurus-plugin-content-docs/current';
const releasedEnglish = 'home/versioned_docs/version-1.9.1';
const releasedChinese = 'home/i18n/zh-cn/docusaurus-plugin-content-docs/version-1.9.1';

test('current account and security guidance reflects the shipped role boundary', () => {
  const config = read('hertzbeat-startup/src/main/resources/sureness.yml');
  assert.match(config, /\/api\/monitor\/\*\*===post===\[admin,user\]/);
  assert.match(config, /\/api\/otlp\/v1\/\*\*===post===\[admin,user\]/);
  assert.match(config, /\/api\/v2\/alerts===post===\[admin,user\]/);
  const accountOffset = config.indexOf('\naccount:');
  assert.notEqual(accountOffset, -1);
  assert.deepEqual([...config.slice(accountOffset).matchAll(/appId:\s*(\S+)/g)].map((match) => match[1]), ['admin']);
  for (const locale of [english, chinese]) {
    const account = read(`${locale}/start/account-modify.md`);
    const model = read(`${locale}/help/security_model.md`);
    assert.match(account, /role: \[admin\]/);
    assert.doesNotMatch(account, /appId:\s*(?:tom|guest|lili)\b/);
    for (const token of ['admin', 'user', 'guest', 'sureness.yml']) assert.ok(model.includes(token));
  }
  const model = read(`${english}/help/security_model.md`);
  assert.match(model, /does not enforce an admin-only management boundary/);
  assert.doesNotMatch(model, /all users have management permissions/i);
});

test('account guides describe Digest as opt-in for both versions and locales', () => {
  const config = read('hertzbeat-startup/src/main/resources/application.yml');
  const auths = /auths:\s*\n([\s\S]*?)\n  jwt:/.exec(config)?.[1];
  assert.ok(auths);
  assert.match(auths, /- basic\s*\n\s*- jwt/);
  assert.doesNotMatch(auths, /digest/i);
  for (const locale of [english, chinese, releasedEnglish, releasedChinese]) {
    const account = read(`${locale}/start/account-modify.md`);
    for (const token of ['Digest', 'sureness.auths', '401']) assert.ok(account.includes(token), `${locale}: ${token}`);
    assert.doesNotMatch(account, /answered with `401` and a `WWW-Authenticate: Digest` challenge/);
  }
  for (const locale of [english, releasedEnglish]) {
    const account = read(`${locale}/start/account-modify.md`);
    assert.match(account, /Digest is disabled by default/);
    assert.match(account, /If Digest is explicitly enabled/);
  }
  for (const locale of [releasedEnglish, releasedChinese]) {
    const migration = read(`${locale}/help/admin_only_migration.md`);
    for (const name of ['OTLP HTTP', 'Alertmanager']) {
      const row = migration.split('\n').find((line) => line.includes(name));
      assert.ok(row, `${locale}: ${name}`);
      assert.match(row, /admin(?:,|\/)user/);
    }
  }
  assert.match(read(`${releasedEnglish}/help/security_model.md`), /management plane/);
  assert.doesNotMatch(read(`${releasedEnglish}/help/security_model.md`), /removes the user and guest roles and keeps only admin|Planned for 1\.9\.1/);
});
