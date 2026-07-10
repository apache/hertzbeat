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
      identitiesItems: ['{\n  "identityKey": "service.name",\n  "identityValue": "checkout-api"\n}'],
      monitorBindItems: ['{\n  "monitorId": "12"\n}'],
      relationItems: ['{\n  "type": "depends_on",\n  "target": "payments"\n}']
    });
  });

  it('keeps existing identities focused on editable business fields', () => {
    expect(
      buildEntityEditorFormState({
        entity: {},
        identities: [
          {
            id: 1726,
            entityId: 659629483818240,
            identityType: 'derived',
            identityKey: 'service.name',
            identityValue: 'checkout-api',
            normalizedValue: 'checkout-api',
            priority: 90,
            primaryIdentity: true,
            creator: 'admin',
            modifier: 'admin',
            gmtCreate: '2026-07-08T21:59:14.48645',
            gmtUpdate: '2026-07-08T21:59:14.48645'
          }
        ],
        monitorBinds: [],
        relations: []
      }).identitiesItems
    ).toEqual([
      '{\n  "identityType": "derived",\n  "identityKey": "service.name",\n  "identityValue": "checkout-api",\n  "priority": 90,\n  "primaryIdentity": true\n}'
    ]);
  });

  it('keeps existing monitor bindings focused on editable business fields', () => {
    expect(
      buildEntityEditorFormState({
        entity: {},
        identities: [],
        monitorBinds: [
          {
            id: 17,
            entityId: 659554516970752,
            monitorId: 659433550654720,
            bindType: 'manual',
            bindSource: 'manual',
            status: 'active',
            score: 100,
            matchContext: { source: 'operator' },
            creator: 'admin',
            modifier: 'admin',
            gmtCreate: '2026-07-08T17:55:01.453337',
            gmtUpdate: '2026-07-08T17:55:01.453337'
          }
        ],
        relations: []
      }).monitorBindItems
    ).toEqual([
      '{\n  "monitorId": "659433550654720",\n  "bindType": "manual",\n  "bindSource": "manual",\n  "status": "active",\n  "score": 100,\n  "matchContext": {\n    "source": "operator"\n  }\n}'
    ]);
  });
});
