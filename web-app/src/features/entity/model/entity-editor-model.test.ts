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

import type { EditableEntityDto } from './entity-editor-contract';
import {
  buildEntityCreatePayload,
  buildEntityUpdatePayload,
  emptyEntityEditorDraft,
  validateEntityEditorDraft
} from './entity-editor-model';

describe('entity editor payload boundary', () => {
  it('creates the minimum resource payload and delegates identity derivation to the server', () => {
    expect(buildEntityCreatePayload({ ...emptyEntityEditorDraft, type: 'service', name: 'checkout' })).toEqual({
      entity: { type: 'service', name: 'checkout' },
      identities: [],
      monitorBinds: [],
      relations: []
    });
  });

  it('creates one explicit manual binding when discovery owns the source monitor', () => {
    expect(
      buildEntityCreatePayload({ ...emptyEntityEditorDraft, type: 'database', name: 'primary-db' }, 3)
    ).toMatchObject({
      entity: { type: 'database', name: 'primary-db' },
      monitorBinds: [{ monitorId: 3, bindType: 'manual', bindSource: 'manual', status: 'active', score: 100 }]
    });
    expect(
      buildEntityCreatePayload({ ...emptyEntityEditorDraft, type: 'database', name: 'primary-db' }, -1)
    ).toMatchObject({ monitorBinds: [] });
  });

  it('preserves every hidden DTO branch and unedited entity field during basic edits', () => {
    const original: EditableEntityDto = {
      entity: {
        id: 7,
        type: 'service',
        name: 'checkout',
        subtype: 'web-service',
        status: 'degraded',
        source: 'discovery',
        workspaceId: 'team-a',
        componentOf: ['system:commerce'],
        extensions: { protected: true }
      },
      identities: [{ id: 9, identityKey: 'service.name', identityValue: 'checkout', identityType: 'otlp' }],
      monitorBinds: [{ id: 4, monitorId: 3, extra: 'keep' }],
      relations: [{ id: 5, targetEntityId: 8, relationType: 'depends_on' }]
    };
    const draft = {
      ...emptyEntityEditorDraft,
      type: 'service',
      name: 'checkout-api',
      displayName: 'Checkout API'
    };

    expect(buildEntityUpdatePayload(original, draft)).toEqual({
      ...original,
      entity: { ...original.entity, name: 'checkout-api', displayName: 'Checkout API' }
    });
  });

  it('rejects blank names and types outside the versioned server catalog', () => {
    expect(validateEntityEditorDraft(emptyEntityEditorDraft)).toMatchObject({ type: 'required', name: 'required' });
    expect(validateEntityEditorDraft({ ...emptyEntityEditorDraft, type: 'custom', name: 'resource' })).toMatchObject({
      type: 'unsupported'
    });
  });
});
