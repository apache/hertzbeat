import { describe, expect, it, vi } from 'vitest';
import {
  buildEntityEditorCatalogSuggestionsUrl,
  buildEntityEditorNewDraft,
  buildEntityEditorNewDraftFromFacade,
  buildEntityEditorSeedMonitorUrl,
  buildEmptyEntityCatalogSuggestions,
  buildEntityPayload,
  buildFallbackEntityDto,
  loadEntityEditorCatalogSuggestions,
  loadEntityEditorCatalogSuggestionsFromFacade,
  loadEntityEditorEntity,
  loadEntityEditorEntityFromFacade,
  parseEntityJsonCollection,
  saveEntityPayload
} from './controller';
import type { EntityDto } from '@/lib/types';

const baseDraft: EntityDto = {
  entity: {
    type: 'service',
    name: 'checkout-api',
    labels: { stale: 'value' }
  },
  identities: [],
  monitorBinds: [],
  relations: []
};

function buildSaveActions(overrides: Partial<Parameters<typeof saveEntityPayload>[2]> = {}): Parameters<typeof saveEntityPayload>[2] {
  return {
    createEntity: async () => 42,
    updateEntity: async () => undefined,
    buildCreateSuccessMessage: id => `created:${id}`,
    saveSuccessMessage: 'saved',
    nameRequiredMessage: 'Entity name is required',
    jsonObjectRequiredMessage: (label, index) => `${label} item ${index} must be an object`,
    identityIncompleteMessage: index => `Identity item ${index} is incomplete`,
    monitorBindIncompleteMessage: index => `Monitor bind item ${index} is incomplete`,
    relationIncompleteMessage: index => `Relation item ${index} is incomplete`,
    identityDuplicateMessage: index => `Identity item ${index} is duplicate`,
    monitorBindDuplicateMessage: index => `Monitor bind item ${index} is duplicate`,
    relationDuplicateMessage: index => `Relation item ${index} is duplicate`,
    ...overrides
  };
}

describe('entity editor controller', () => {
  it('exposes stable resource URLs for editor cache keys', () => {
    expect(buildEntityEditorCatalogSuggestionsUrl()).toBe('/entities/catalog-suggestions?limit=120');
    expect(buildEntityEditorSeedMonitorUrl('42')).toBe('/monitor/42');
  });

  it('builds the API payload from editor state', () => {
    expect(
      buildEntityPayload(
        {
          draft: baseDraft,
          labelRows: [
            { key: 'team', value: ' platform ' },
            { key: ' ', value: 'ignored' }
          ],
          tagsText: 'payments, critical , payments',
          links: [{ name: 'runbook', url: 'https://runbook.internal' }, {}],
          contacts: [{ name: 'oncall', contact: 'slack' }, {}],
          owners: [{ name: 'platform' }, {}],
          componentOfText: 'commerce, payments',
          componentsText: 'checkout-ui, order-router',
          implementedByText: 'api,worker',
          languagesText: 'java, typescript',
          identitiesItems: ['{"key":"service.name","value":"checkout-api"}', '   '],
          monitorBindItems: ['{"id":12}'],
          relationItems: ['{"type":"depends_on","target":"payments"}']
        },
        (label, index) => `${label}:${index}`
      )
    ).toEqual({
      entity: {
        type: 'service',
        name: 'checkout-api',
        labels: { team: 'platform' },
        tags: ['payments', 'critical', 'payments'],
        links: [{ name: 'runbook', url: 'https://runbook.internal' }],
        contacts: [{ name: 'oncall', contact: 'slack' }],
        additionalOwners: [{ name: 'platform' }],
        componentOf: ['commerce', 'payments'],
        components: ['checkout-ui', 'order-router'],
        implementedBy: ['api', 'worker'],
        languages: ['java', 'typescript']
      },
      identities: [{ key: 'service.name', value: 'checkout-api' }],
      monitorBinds: [{ id: 12 }],
      relations: [{ type: 'depends_on', target: 'payments' }]
    });
  });

  it('raises translated errors for invalid json items', () => {
    expect(() =>
      parseEntityJsonCollection(['{"valid":true}', '{oops'], 'Relations', (label, index) => `${label} item ${index} invalid`)
    ).toThrowError('Relations item 2 invalid');
  });

  it('ignores blank json rows', () => {
    expect(parseEntityJsonCollection(['{}', ' ', '\n'], 'Identities', (label, index) => `${label}:${index}`)).toEqual([{}]);
  });

  it('falls back to an empty catalog suggestion payload when the backend endpoint is missing', async () => {
    const apiGet = async () => {
      throw new Error('GET /entities/catalog-suggestions failed with 404');
    };

    await expect(loadEntityEditorCatalogSuggestions(apiGet as any)).resolves.toEqual(buildEmptyEntityCatalogSuggestions());
  });

  it('loads catalog suggestions through the entity facade reader while preserving the 404 fallback', async () => {
    const readCatalogSuggestions = vi.fn(async (limit?: number) => {
      expect(limit).toBe(120);
      return { owners: ['platform'] };
    });

    await expect(loadEntityEditorCatalogSuggestionsFromFacade(readCatalogSuggestions as any)).resolves.toEqual({ owners: ['platform'] });
    expect(readCatalogSuggestions).toHaveBeenCalledWith(120);

    const missingCatalogSuggestions = async () => {
      throw new Error('GET /entities/catalog-suggestions failed with 404');
    };
    await expect(loadEntityEditorCatalogSuggestionsFromFacade(missingCatalogSuggestions as any)).resolves.toEqual(
      buildEmptyEntityCatalogSuggestions()
    );
  });

  it('falls back to a reusable draft entity when the backend entity endpoint is missing', async () => {
    const apiGet = async () => {
      throw new Error('GET /entities/42 failed with 404');
    };

    await expect(loadEntityEditorEntity(apiGet as any, '42')).resolves.toEqual(buildFallbackEntityDto('42'));
  });

  it('loads editor entity drafts through the entity facade reader while preserving the 404 fallback', async () => {
    const readEntity = vi.fn(async (entityId: string) => {
      expect(entityId).toBe('42');
      return baseDraft;
    });

    await expect(loadEntityEditorEntityFromFacade(readEntity as any, '42')).resolves.toEqual(baseDraft);
    expect(readEntity).toHaveBeenCalledWith('42');

    const missingEntity = async () => {
      throw new Error('GET /entities/42 failed with 404');
    };
    await expect(loadEntityEditorEntityFromFacade(missingEntity as any, '42')).resolves.toEqual(buildFallbackEntityDto('42'));
  });

  it('builds a telemetry-seeded draft when discovery hands off a monitor id', async () => {
    const apiGet = vi.fn(async (path: string) => {
      if (path === '/monitor/42') {
        return {
          monitor: {
            id: 42,
            name: 'codex-history-green-443',
            app: 'website',
            instance: 'example.com:443',
            status: 1
          }
        };
      }
      throw new Error(`unexpected path: ${path}`);
    });

    await expect(
      buildEntityEditorNewDraft(apiGet as any, {
        source: 'telemetry',
        monitorId: '42'
      })
    ).resolves.toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          type: 'endpoint',
          name: 'example.com:443',
          displayName: 'codex-history-green-443',
          system: 'website',
          source: 'otel_resource'
        }),
        identities: expect.arrayContaining([expect.objectContaining({ identityKey: 'endpoint.url', identityValue: 'example.com:443' })]),
        monitorBinds: expect.arrayContaining([expect.objectContaining({ monitorId: 42, source: 'otel_resource' })])
      })
    );
  });

  it('builds a telemetry-seeded draft through the monitor facade reader', async () => {
    const readSeedMonitor = vi.fn(async (monitorId: string) => {
      expect(monitorId).toBe('42');
      return {
        id: 42,
        name: 'codex-history-green-443',
        app: 'website',
        instance: 'example.com:443',
        status: 1
      };
    });

    await expect(
      buildEntityEditorNewDraftFromFacade(readSeedMonitor as any, {
        source: 'telemetry',
        monitorId: '42'
      })
    ).resolves.toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          type: 'endpoint',
          name: 'example.com:443',
          displayName: 'codex-history-green-443',
          system: 'website',
          source: 'otel_resource'
        }),
        monitorBinds: expect.arrayContaining([expect.objectContaining({ monitorId: 42, source: 'otel_resource' })])
      })
    );
    expect(readSeedMonitor).toHaveBeenCalledWith('42');
  });

  it('builds a monitor-seeded draft for discovery candidate creation', async () => {
    const readSeedMonitor = vi.fn(async (monitorId: string) => {
      expect(monitorId).toBe('42');
      return {
        id: 42,
        name: 'checkout-discovery-monitor',
        app: 'website',
        instance: 'checkout.example.com:443',
        status: 1
      };
    });

    await expect(
      buildEntityEditorNewDraftFromFacade(readSeedMonitor as any, {
        source: 'discovery-candidate',
        monitorId: '42'
      })
    ).resolves.toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          type: 'endpoint',
          name: 'checkout.example.com:443',
          displayName: 'checkout-discovery-monitor',
          system: 'website',
          source: 'otel_resource'
        }),
        identities: expect.arrayContaining([
          expect.objectContaining({ identityKey: 'endpoint.url', identityValue: 'checkout.example.com:443' })
        ]),
        monitorBinds: expect.arrayContaining([expect.objectContaining({ monitorId: 42, source: 'otel_resource' })])
      })
    );
    expect(readSeedMonitor).toHaveBeenCalledWith('42');
  });

  it('does not invent an endpoint.url identity when a discovery candidate has no trustworthy host instance', async () => {
    const readSeedMonitor = vi.fn(async (monitorId: string) => {
      expect(monitorId).toBe('42');
      return {
        id: 42,
        name: 'checkout-discovery-monitor',
        app: 'website',
        instance: 'null:4223',
        status: 2
      };
    });

    const draft = await buildEntityEditorNewDraftFromFacade(readSeedMonitor as any, {
      source: 'discovery-candidate',
      monitorId: '42'
    });

    expect(draft.entity).toEqual(
      expect.objectContaining({
        displayName: 'checkout-discovery-monitor',
        system: 'website',
        source: 'otel_resource'
      })
    );
    expect(draft.identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identityKey: 'service.name',
          identityValue: 'checkout-discovery-monitor'
        })
      ])
    );
    expect(draft.identities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identityKey: 'endpoint.url'
        })
      ])
    );
    expect(JSON.stringify(draft)).not.toContain('null:4223');
    expect(readSeedMonitor).toHaveBeenCalledWith('42');
  });

  it('keeps the reusable manual draft when the monitor facade seed endpoint is missing', async () => {
    const readSeedMonitor = async () => {
      throw new Error('GET /monitor/42 failed with 404');
    };

    await expect(
      buildEntityEditorNewDraftFromFacade(readSeedMonitor as any, {
        source: 'telemetry',
        monitorId: '42'
      })
    ).resolves.toEqual(buildInitialManualDraftForTest());
  });

  it('keeps the reusable manual draft when telemetry handoff is incomplete', async () => {
    const apiGet = vi.fn();

    await expect(
      buildEntityEditorNewDraft(apiGet as any, {
        source: 'telemetry',
        monitorId: ''
      })
    ).resolves.toEqual({
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
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('builds an OTLP candidate draft without inventing monitor binds or ownership', async () => {
    const apiGet = vi.fn();

    await expect(
      buildEntityEditorNewDraft(apiGet as any, {
        source: 'otlp-candidate',
        identityKey: 'service.name',
        identityValue: 'billing',
        serviceName: 'billing-api',
        serviceNamespace: 'commerce',
        environment: 'prod'
      } as any)
    ).resolves.toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          type: 'service',
          name: 'billing',
          displayName: 'billing-api',
          namespace: 'commerce',
          environment: 'prod',
          source: 'otel_resource',
          owner: ''
        }),
        identities: expect.arrayContaining([
          expect.objectContaining({
            identityType: 'otel_resource',
            identityKey: 'service.name',
            identityValue: 'billing',
            primaryIdentity: true
          }),
          expect.objectContaining({
            identityType: 'otel_resource',
            identityKey: 'service.namespace',
            identityValue: 'commerce'
          }),
          expect.objectContaining({
            identityType: 'otel_resource',
            identityKey: 'deployment.environment.name',
            identityValue: 'prod'
          })
        ]),
        monitorBinds: [],
        relations: []
      })
    );
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('keeps OTLP service.name candidate drafts aligned with backend identity canonicalization', async () => {
    const apiGet = vi.fn();

    const draft = await buildEntityEditorNewDraft(apiGet as any, {
      source: 'otlp-candidate',
      identityKey: 'service.name',
      identityValue: 'checkout-api',
      serviceName: 'checkout-api-copy',
      serviceNamespace: 'payments',
      environment: 'prod'
    } as any);

    expect(draft.entity.name).toBe('checkout-api');
    expect(draft.entity.displayName).toBe('checkout-api-copy');
    expect(draft.identities[0]).toEqual(
      expect.objectContaining({
        identityKey: 'service.name',
        identityValue: 'checkout-api',
        primaryIdentity: true
      })
    );
  });

  it('creates new entities and returns the translated success message', async () => {
    await expect(saveEntityPayload('new', baseDraft, buildSaveActions())).resolves.toBe('created:42');
  });

  it('blocks whitespace-only entity names before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload('new', { ...baseDraft, entity: { ...baseDraft.entity, name: '   ' } }, buildSaveActions({ createEntity }))
    ).rejects.toThrowError('Entity name is required');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('blocks empty identity objects before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload('new', { ...baseDraft, identities: [{}] }, buildSaveActions({ createEntity }))
    ).rejects.toThrowError('Identities item 1 must be an object');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('blocks incomplete monitor bindings before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload('new', { ...baseDraft, monitorBinds: [{ bindType: 'manual' }] }, buildSaveActions({ createEntity }))
    ).rejects.toThrowError('Monitor bind item 1 is incomplete');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('blocks incomplete relations before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload('new', { ...baseDraft, relations: [{ relationType: 'depends_on' }] }, buildSaveActions({ createEntity }))
    ).rejects.toThrowError('Relation item 1 is incomplete');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('blocks duplicate identities before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload(
        'new',
        {
          ...baseDraft,
          identities: [
            { identityKey: 'service.name', identityValue: 'checkout-api' },
            { identityKey: 'service.name', identityValue: 'checkout-api' }
          ]
        },
        buildSaveActions({ createEntity })
      )
    ).rejects.toThrowError('Identity item 2 is duplicate');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('blocks duplicate monitor bindings before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload(
        'new',
        {
          ...baseDraft,
          monitorBinds: [
            { monitorId: 42, bindType: 'manual' },
            { id: 42, bindType: 'manual' }
          ]
        },
        buildSaveActions({ createEntity })
      )
    ).rejects.toThrowError('Monitor bind item 2 is duplicate');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('blocks duplicate relations before create requests', async () => {
    const createEntity = vi.fn(async () => 42);

    await expect(
      saveEntityPayload(
        'new',
        {
          ...baseDraft,
          relations: [
            { relationType: 'depends_on', targetRef: 'service:checkout' },
            { type: 'depends_on', target: 'service:checkout' }
          ]
        },
        buildSaveActions({ createEntity })
      )
    ).rejects.toThrowError('Relation item 2 is duplicate');
    expect(createEntity).not.toHaveBeenCalled();
  });

  it('updates existing entities and returns the save-success message', async () => {
    await expect(saveEntityPayload('edit', baseDraft, buildSaveActions())).resolves.toBe('saved');
  });
});

function buildInitialManualDraftForTest() {
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
