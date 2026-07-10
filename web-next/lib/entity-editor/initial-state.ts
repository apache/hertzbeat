import { toKeyValueDraft, type KeyValueDraft } from './draft-utils';
import type { EntityDto } from '@/lib/types';

export function buildInitialEntityDraft(): EntityDto {
  return {
    entity: {
      type: 'service',
      name: '',
      displayName: '',
      environment: '',
      status: 'unknown',
      owner: '',
      system: '',
      source: 'manual',
      description: '',
      labels: {}
    },
    identities: [],
    monitorBinds: [],
    relations: []
  };
}

export type EntityEditorFormState = {
  labelRows: KeyValueDraft[];
  tagsText: string;
  componentOfText: string;
  componentsText: string;
  implementedByText: string;
  languagesText: string;
  identitiesItems: string[];
  monitorBindItems: string[];
  relationItems: string[];
};

function readEntityEditorText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }
  return undefined;
}

function toEntityEditorIdentityDraft(item: unknown) {
  if (typeof item !== 'object' || item == null || Array.isArray(item)) {
    return item;
  }

  const record = item as Record<string, unknown>;
  const identityType = readEntityEditorText(record, ['identityType', 'type']);
  const identityKey = readEntityEditorText(record, ['identityKey', 'key', 'name', 'attributeKey']);
  const identityValue = readEntityEditorText(record, ['identityValue', 'value', 'attributeValue']);
  const priority = record.priority;
  const primaryIdentity = record.primaryIdentity;
  const draft: Record<string, unknown> = {};

  if (identityType != null) draft.identityType = identityType;
  if (identityKey != null) draft.identityKey = identityKey;
  if (identityValue != null) draft.identityValue = identityValue;
  if (typeof priority === 'number') draft.priority = priority;
  if (typeof primaryIdentity === 'boolean') draft.primaryIdentity = primaryIdentity;

  return Object.keys(draft).length > 0 ? draft : item;
}

function toEntityEditorMonitorBindDraft(item: unknown) {
  if (typeof item !== 'object' || item == null || Array.isArray(item)) {
    return item;
  }

  const record = item as Record<string, unknown>;
  const monitorId = readEntityEditorText(record, ['monitorId', 'id']);
  const bindType = readEntityEditorText(record, ['bindType', 'type']);
  const bindSource = readEntityEditorText(record, ['bindSource', 'source']);
  const status = readEntityEditorText(record, ['status']);
  const score = record.score;
  const matchContext = record.matchContext;
  const draft: Record<string, unknown> = {};

  if (monitorId != null) draft.monitorId = monitorId;
  if (bindType != null) draft.bindType = bindType;
  if (bindSource != null) draft.bindSource = bindSource;
  if (status != null) draft.status = status;
  if (typeof score === 'number') draft.score = score;
  if (matchContext != null) draft.matchContext = matchContext;

  return Object.keys(draft).length > 0 ? draft : item;
}

export function buildEntityEditorFormState(initial: EntityDto): EntityEditorFormState {
  return {
    labelRows: toKeyValueDraft(initial.entity.labels),
    tagsText: (initial.entity.tags || []).join(', '),
    componentOfText: (initial.entity.componentOf || []).join(', '),
    componentsText: (initial.entity.components || []).join(', '),
    implementedByText: (initial.entity.implementedBy || []).join(', '),
    languagesText: (initial.entity.languages || []).join(', '),
    identitiesItems: (initial.identities || []).map(item => JSON.stringify(toEntityEditorIdentityDraft(item), null, 2)),
    monitorBindItems: (initial.monitorBinds || []).map(item => JSON.stringify(toEntityEditorMonitorBindDraft(item), null, 2)),
    relationItems: (initial.relations || []).map(item => JSON.stringify(item, null, 2))
  };
}
