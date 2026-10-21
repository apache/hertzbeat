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

import { afterEach, expect, it, vi } from 'vitest';
import { highlightLogMessages } from './hertzbeat-log-message-highlight';

afterEach(() => vi.unstubAllGlobals());

it('highlights literal message matches without changing DOM or copy text and cleans up only its own ranges', () => {
  const highlights = new Map<string, Set<Range>>();
  vi.stubGlobal('Highlight', Set);
  vi.stubGlobal('CSS', { highlights });
  const root = document.createElement('div');
  root.innerHTML =
    '<div data-log-index="0"><div><time>time</time><div><p>a.b &lt;tag&gt; a.b</p><button>a.b</button></div></div></div>';
  const original = root.innerHTML;
  const clear = highlightLogMessages(root, 'a.b');
  const clearSecond = highlightLogMessages(root, '<tag>');
  expect([...highlights.get('hertzbeat-log-search')!].map(range => range.toString())).toEqual(['a.b', 'a.b', '<tag>']);
  expect(root.innerHTML).toBe(original);
  clear();
  expect([...highlights.get('hertzbeat-log-search')!].map(range => range.toString())).toEqual(['<tag>']);
  clearSecond();
  expect(highlights.size).toBe(0);
});

it('leaves logs readable when native highlighting is unavailable or the search is empty', () => {
  const root = document.createElement('div');
  expect(() => highlightLogMessages(root, 'text')()).not.toThrow();
  expect(() => highlightLogMessages(root, '')()).not.toThrow();
});

it('matches case-insensitive literals using original UTF-16 offsets after expanding Unicode characters', () => {
  const highlights = new Map<string, Set<Range>>();
  vi.stubGlobal('Highlight', Set);
  vi.stubGlobal('CSS', { highlights });
  const root = document.createElement('div');
  root.innerHTML = '<div data-log-index="0"><div><div><p>İ 😀 ERROR error Error a.b A.B</p></div></div></div>';
  const clear = highlightLogMessages(root, 'error');
  expect([...highlights.get('hertzbeat-log-search')!].map(range => range.toString())).toEqual([
    'ERROR',
    'error',
    'Error'
  ]);
  clear();
  highlightLogMessages(root, 'a.b');
  expect([...highlights.get('hertzbeat-log-search')!].map(range => range.toString())).toEqual(['a.b', 'A.B']);
});
