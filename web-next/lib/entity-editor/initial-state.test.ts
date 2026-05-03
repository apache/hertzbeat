import { describe, expect, it } from 'vitest';
import { buildEntityEditorFormState, buildInitialEntityDraft } from './initial-state';

describe('entity editor initial state', () => {
  it('builds the default new entity draft', () => {
    expect(buildInitialEntityDraft()).toEqual({
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
    });
  });

  it('builds the serialized editor form state from an entity dto', () => {
    expect(
      buildEntityEditorFormState({
        entity: {
          labels: { team: 'platform' },
          tags: ['payments', 'critical'],
          componentOf: ['commerce'],
          components: ['checkout-ui'],
          implementedBy: ['checkout-api'],
          languages: ['java']
        },
        identities: [{ key: 'service.name', value: 'checkout-api' }],
        monitorBinds: [{ id: 12 }],
        relations: [{ type: 'depends_on', target: 'payments' }]
      })
    ).toEqual({
      labelRows: [{ key: 'team', value: 'platform' }],
      tagsText: 'payments, critical',
      componentOfText: 'commerce',
      componentsText: 'checkout-ui',
      implementedByText: 'checkout-api',
      languagesText: 'java',
      identitiesItems: ['{\n  "key": "service.name",\n  "value": "checkout-api"\n}'],
      monitorBindItems: ['{\n  "id": 12\n}'],
      relationItems: ['{\n  "type": "depends_on",\n  "target": "payments"\n}']
    });
  });
});
