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

import apiSource from './api/label-api.ts?raw';
import schemaSource from './api/label-schema.ts?raw';
import modelSource from './model/label-model.ts?raw';

function sourceLineCount(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('//')).length;
}

describe('Label architecture', () => {
  it('keeps response parsing at the API boundary and domain types in the model', () => {
    expect(apiSource).toContain('apiMessageGet');
    expect(apiSource).toContain("from './label-schema'");
    expect(apiSource).toContain("from '../model/label-model'");
    expect(modelSource).not.toMatch(/api\/label-api|core\/http/);
    expect(schemaSource).toContain("from 'zod'");
  });

  it('keeps each Label boundary small enough to review', () => {
    expect(sourceLineCount(apiSource)).toBeLessThanOrEqual(250);
    expect(sourceLineCount(schemaSource)).toBeLessThanOrEqual(250);
    expect(sourceLineCount(modelSource)).toBeLessThanOrEqual(250);
  });
});
