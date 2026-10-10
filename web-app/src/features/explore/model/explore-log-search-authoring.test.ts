/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect, it } from 'vitest';
import {
  searchCompletionContext,
  insertSearchCompletion,
  searchFieldName,
  searchSuggestionCondition
} from './explore-log-search-authoring';
it('maps canonical fields separately from raw resource identities', () => {
  expect(searchFieldName({ id: 'builtin:serviceName', source: 'builtin', key: 'serviceName' })).toBe('service');
  expect(searchFieldName({ id: 'resource:service.name', source: 'resource', key: 'service.name' })).toBe(
    'resource.service.name'
  );
  expect(searchFieldName({ id: 'attribute:http.status_code', source: 'attribute', key: 'http.status_code' })).toBe(
    '@http.status_code'
  );
});
it('replaces only the caret token and quotes values literally', () => {
  const text = 'service:chec AND status:ERROR';
  const context = searchCompletionContext(text, 12);
  expect(context).toMatchObject({ field: 'service', prefix: 'chec', start: 8, end: 12 });
  expect(insertSearchCompletion(text, context!, 'a"b\\*', true)).toEqual({
    text: 'service:"a\\"b\\\\\\*" AND status:ERROR',
    caret: 18
  });
});
it('renders a selected field value as its complete escaped condition', () => {
  expect(searchSuggestionCondition('@event.name', 'api "failed"*')).toBe('@event.name:"api \\"failed\\"\\*"');
});
it('replaces a bare field prefix with the selected complete condition', () => {
  const text = 'sta AND service:api';
  const context = searchCompletionContext(text, 3);
  expect(context).toMatchObject({ prefix: 'sta', start: 0, end: 3 });
  expect(insertSearchCompletion(text, context!, 'INFO', true, searchSuggestionCondition('status', 'INFO'))).toEqual({
    text: 'status:"INFO" AND service:api',
    caret: 13
  });
});
it('does not complete within quoted content or consume remaining clauses', () => {
  expect(searchCompletionContext('service:"a b', 12)).toBeNull();
  expect(searchCompletionContext('service:x AND sta', 17)).toMatchObject({ prefix: 'sta', start: 14, end: 17 });
});

it('does not replace a partially quoted or escaped token after the caret', () => {
  expect(searchCompletionContext('service:ab"cd', 10)).toBeNull();
  expect(searchCompletionContext('service:ab\\cd', 10)).toBeNull();
});

it.each(['@codes[]:[2 TO ', '@codes[]:(4 ', 'resource.allowed_codes[]:[2 TO ', '@codes[ ] : [2 TO '])(
  'does not reinterpret a collection predicate as scalar completion: %s',
  text => {
    expect(searchCompletionContext(text, text.length)).toBeNull();
  }
);

it('retains ordinary completion after quoted or escaped collection-like text', () => {
  for (const text of [
    'message:"literal []: text" AND ser',
    'message:"open []:',
    String.raw`message:literal\[]: AND ser`
  ]) {
    const context = searchCompletionContext(text, text.length);
    if (text.endsWith('ser')) expect(context?.prefix).toBe('ser');
    else expect(context).toBeNull();
  }
});

it.each(['@names[]:"Peter"', '@codes[]:"4"', '@names[]:""', String.raw`@names[]:"a\"b\\c's*?"`])(
  'leaves quoted collection content untouched by scalar completion: %s',
  text => {
    for (const caret of [text.length, text.indexOf(':') + 2]) {
      expect(searchCompletionContext(text, caret)).toBeNull();
    }
  }
);

it.each(['@users[]["codes"][]:[2 TO ', '@users[ ]["codes"] [ ] : (4 ', '@users[]["name"][]:"Pe'])(
  'declines scalar completion for explicit nested collection text: %s',
  text => {
    expect(searchCompletionContext(text, text.length)).toBeNull();
  }
);
