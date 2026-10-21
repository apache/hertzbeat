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

import { useMemo, useState } from 'react';

import type { EditableEntityDto, EntityEditorDraft } from '../model/entity-editor-contract';
import { emptyEntityEditorDraft, entityEditorDraftFrom } from '../model/entity-editor-model';
import type { EntityDiscoveryCreateSource } from '../model/entity-discovery-model';

/**
 * Owns draft hydration separately from the editor's API and mutation lifecycle.
 * A discovery handoff is an initial value, not a user edit, so cancel remains a
 * no-confirmation return until the operator changes a field.
 */
export function useEntityEditorDraft(
  detail: EditableEntityDto | undefined,
  createSource: EntityDiscoveryCreateSource | undefined
) {
  const initial = useMemo(
    () =>
      detail
        ? entityEditorDraftFrom(detail.entity)
        : { ...emptyEntityEditorDraft, ...(createSource ? { name: createSource.monitorName } : {}) },
    [createSource, detail]
  );
  const source = detail?.entity.id ?? (createSource ? `monitor:${createSource.monitorId}` : 'new');
  const [edited, setEdited] = useState<{ source: number | string; draft: EntityEditorDraft }>();
  const draft = edited?.source === source ? edited.draft : initial;
  const setDraft = (update: (current: EntityEditorDraft) => EntityEditorDraft) => {
    setEdited(current => ({ source, draft: update(current?.source === source ? current.draft : initial) }));
  };
  return { initial, draft, setDraft, clearDraft: () => setEdited(undefined), hydrated: detail !== undefined };
}
