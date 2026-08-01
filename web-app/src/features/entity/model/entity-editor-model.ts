/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  entityCriticalities,
  entityTypes,
  type EditableEntityDto,
  type EditableEntityInfo,
  type EntityEditorDraft,
  type EntityEditorErrors,
  type EntityEditorField
} from './entity-editor-contract';

export const emptyEntityEditorDraft: EntityEditorDraft = {
  type: '',
  name: '',
  displayName: '',
  namespace: '',
  environment: '',
  owner: '',
  system: '',
  lifecycle: '',
  tier: '',
  criticality: '',
  runbook: '',
  description: '',
  labels: '',
  tags: ''
};

const optionalFields = [
  'displayName',
  'namespace',
  'environment',
  'owner',
  'system',
  'lifecycle',
  'tier',
  'criticality',
  'runbook',
  'description'
] as const;

export function entityEditorDraftFrom(info: EditableEntityInfo): EntityEditorDraft {
  return {
    ...emptyEntityEditorDraft,
    ...Object.fromEntries(optionalFields.map(key => [key, draftText(info[key])])),
    type: info.type,
    name: info.name,
    labels: Object.entries(info.labels ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
    tags: (info.tags ?? []).join(', ')
  };
}

export function validateEntityEditorDraft(draft: EntityEditorDraft): EntityEditorErrors {
  const errors: EntityEditorErrors = {};
  if (!draft.type.trim()) errors.type = 'required';
  else if (!entityTypes.includes(draft.type as (typeof entityTypes)[number])) errors.type = 'unsupported';
  if (!draft.name.trim()) errors.name = 'required';
  if (draft.criticality && !entityCriticalities.includes(draft.criticality as never))
    errors.criticality = 'unsupported';
  if (!parseLabels(draft.labels)) errors.labels = 'invalid';
  return errors;
}

export function buildEntityCreatePayload(draft: EntityEditorDraft, sourceMonitorId?: number): EditableEntityDto {
  const entity = writeEditedFields({ type: draft.type.trim(), name: draft.name.trim() }, draft, false);
  // Ordinary creation delegates identity derivation to the server. Discovery
  // adds only its verified source monitor; expert evidence stays out of the form.
  const monitorBinds =
    Number.isSafeInteger(sourceMonitorId) && Number(sourceMonitorId) > 0
      ? [{ monitorId: sourceMonitorId, bindType: 'manual', bindSource: 'manual', status: 'active', score: 100 }]
      : [];
  return { entity, identities: [], monitorBinds, relations: [] };
}

export function buildEntityUpdatePayload(original: EditableEntityDto, draft: EntityEditorDraft): EditableEntityDto {
  // Preserve expert-owned identity, binding, relation, and EntityInfo fields hidden by this basic form.
  return { ...original, entity: writeEditedFields({ ...original.entity }, draft, true) };
}

export function isEntityEditorDirty(initial: EntityEditorDraft, current: EntityEditorDraft) {
  return (Object.keys(initial) as EntityEditorField[]).some(key => initial[key] !== current[key]);
}

function writeEditedFields(entity: EditableEntityInfo, draft: EntityEditorDraft, clearing: boolean) {
  entity.type = draft.type.trim();
  entity.name = draft.name.trim();
  optionalFields.forEach(key => assignOptional(entity, key, draft[key], clearing));
  const labels = parseLabels(draft.labels);
  if (draft.labels.trim() || (clearing && entity.labels !== undefined)) entity.labels = labels ?? {};
  const tags = draft.tags
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (tags.length || (clearing && entity.tags !== undefined)) entity.tags = tags;
  return entity;
}

function assignOptional(
  entity: EditableEntityInfo,
  key: (typeof optionalFields)[number],
  value: string,
  clearing: boolean
) {
  const normalized = value.trim();
  if (normalized) entity[key] = normalized;
  else if (clearing && entity[key] !== undefined) entity[key] = null;
}

function parseLabels(value: string): Record<string, string> | undefined {
  const labels: Record<string, string> = {};
  for (const entry of value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)) {
    const separator = entry.indexOf('=');
    if (separator <= 0) return undefined;
    const key = entry.slice(0, separator).trim();
    const item = entry.slice(separator + 1).trim();
    if (!key || !item) return undefined;
    labels[key] = item;
  }
  return labels;
}

function draftText(value: unknown) {
  return typeof value === 'string' ? value : '';
}
