/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
