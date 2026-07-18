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

import apiSource from './api/object-store-api.ts?raw';
import schemaSource from './api/object-store-schema.ts?raw';
import modelSource from './model/object-store-model.ts?raw';
import pageSource from './pages/object-store-page.tsx?raw';

describe('object store architecture', () => {
  it('owns unknown response parsing and secret removal at the API boundary', () => {
    expect(apiSource).toContain('apiMessageGet<unknown>');
    expect(apiSource).toContain("from './object-store-schema'");
    expect(schemaSource).toContain("from 'zod'");
    expect(schemaSource).toContain('secretConfigured');
    expect(modelSource).not.toMatch(/api\/object-store-api|api-message/);
  });

  it('keeps transport and payload construction out of the page', () => {
    expect(pageSource).not.toMatch(/object-store-api|apiMessage|buildObjectStorePayload/);
    expect(pageSource).not.toMatch(/\buse(?:One|Update)\b/);
  });
});
