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
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';

const require = createRequire(import.meta.url);
const rendererPath = path.join(path.dirname(require.resolve('@docusaurus/core/package.json')), 'lib/client/renderToHtml.js');
const rendererSource = await readFile(rendererPath, 'utf8');
// Docusaurus bundles this ESM source with webpack; resolve its React imports for Node here.
const nodeSource = rendererSource.replace(/(['"])(react-dom\/server(?:\.browser)?)\1/g, (_, quote, name) =>
  `${quote}${pathToFileURL(require.resolve(name)).href}${quote}`,
);
const { renderToHtml } = await import(`data:text/javascript;base64,${Buffer.from(nodeSource).toString('base64')}`);

test('static rendering matches React without inserting or deleting NUL characters', async () => {
  const page = React.createElement('main', null, Array.from({ length: 1000 }, (_, i) =>
    React.createElement('p', { key: i }, 'aaa🙂🙂🙂🙂🙂', i),
  ));
  assert.ok((await renderToHtml(page)) === renderToString(page), 'Rendered HTML must match renderToString');
  const literal = React.createElement('p', null, 'A\0B');
  assert.equal(await renderToHtml(literal), renderToString(literal));
});

test('static rendering rejects component errors', async () => {
  const Broken = () => { throw new Error('render failed'); };
  await assert.rejects(renderToHtml(React.createElement(Broken)), /render failed/);
  const boundary = React.createElement(React.Suspense, { fallback: 'Loading' }, React.createElement(Broken));
  await assert.rejects(renderToHtml(boundary), /render failed/);
});
