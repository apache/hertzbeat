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

export function buildEntityEditorFormState(initial: EntityDto): EntityEditorFormState {
  return {
    labelRows: toKeyValueDraft(initial.entity.labels),
    tagsText: (initial.entity.tags || []).join(', '),
    componentOfText: (initial.entity.componentOf || []).join(', '),
    componentsText: (initial.entity.components || []).join(', '),
    implementedByText: (initial.entity.implementedBy || []).join(', '),
    languagesText: (initial.entity.languages || []).join(', '),
    identitiesItems: (initial.identities || []).map(item => JSON.stringify(item, null, 2)),
    monitorBindItems: (initial.monitorBinds || []).map(item => JSON.stringify(item, null, 2)),
    relationItems: (initial.relations || []).map(item => JSON.stringify(item, null, 2))
  };
}
