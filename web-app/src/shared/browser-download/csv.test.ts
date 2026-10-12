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

import { describe, expect, it } from 'vitest';
import { serializeCsv } from './csv';
describe('spreadsheet-safe CSV serialization', () => {
  it('quotes delimiters and guards formula prefixes after leading control characters', () => {
    expect(
      serializeCsv([
        ['a,"b"\nc', null, undefined, 0],
        ['=1', ' +1', '\t-1', '\u0000@x']
      ])
    ).toBe('"a,""b""\nc","","","0"\r\n"\'=1","\' +1","\'\t-1","\'\u0000@x"');
  });
});

it('keeps finite negative numbers numeric while guarding negative strings', () => {
  expect(serializeCsv([[-1, '-1', -0, 1e-20]])).toBe('"-1","\'-1","0","1e-20"');
  expect(() => serializeCsv([[Infinity]])).toThrow();
  expect(() => serializeCsv([[NaN]])).toThrow();
});
