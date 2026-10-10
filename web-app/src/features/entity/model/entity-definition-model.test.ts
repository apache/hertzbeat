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

import {
  buildEntityDefinitionRoute,
  canSaveEntityDefinition,
  changeEntityDefinitionContent,
  parseEntityDefinitionId,
  previewedEntityDefinition,
  resetEntityDefinitionDraft,
  safeEntityDefinitionReturnTo
} from './entity-definition-model';

const preview = {
  entity: { type: 'service', name: 'checkout' },
  identities: null,
  monitorBinds: null,
  relations: null
};

describe('entity definition model', () => {
  it('requires the exact route/content/format preview snapshot before save', () => {
    const initial = resetEntityDefinitionDraft(7, 'yaml', 'kind: service');
    const ready = previewedEntityDefinition(initial, preview);
    expect(canSaveEntityDefinition(ready, 7)).toBe(true);
    expect(changeEntityDefinitionContent(ready, 'kind: database').preview).toBeUndefined();
    expect(canSaveEntityDefinition(ready, 8)).toBe(false);
  });

  it('accepts only positive safe route IDs and preserves a sanitized detail return context', () => {
    expect(parseEntityDefinitionId('7')).toBe(7);
    expect(parseEntityDefinitionId('0')).toBeUndefined();
    const route = buildEntityDefinitionRoute(7, '/entities?search=mysql&token=private');
    expect(route).toContain('/entities/7/definition?returnTo=');
    expect(decodeURIComponent(route)).toContain('/entities/7?returnTo=');
    expect(decodeURIComponent(route)).not.toContain('token');
    expect(safeEntityDefinitionReturnTo(7, 'https://evil.example')).toBe('/entities/7');
  });
});
