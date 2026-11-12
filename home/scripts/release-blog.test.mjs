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

const home = path.resolve(import.meta.dirname, '..');
const filename = '2026-11-02-hertzbeat-v1.9.1.md';
const releaseCommit = '0fe1c4c4e09cd2b08fee38969961648092d6b1cf';

test('1.9.1 release blog has both locales and links to the matching release', () => {
  for (const directory of [
    'blog',
    'i18n/zh-cn/docusaurus-plugin-content-blog',
  ]) {
    const post = readFileSync(path.join(home, directory, filename), 'utf8');
    assert.match(post, /^author: Apache HertzBeat Community$/m);
    assert.match(post, /^tags: \[releases\]$/m);
    assert.match(post, /^cover_headline: Apache HertzBeat 1\.9\.1$/m);
    assert.ok(post.includes('](/docs/download)'));
    assert.ok(post.includes('](/docs/start/1.9.1-update)'));
    for (const token of [releaseCommit, '`admin`', '`common.secret`', 'Digest']) assert.ok(post.includes(token));
  }
});
