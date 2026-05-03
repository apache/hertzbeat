import { describe, expect, it, vi } from 'vitest';
import {
  buildEntityEditorNewDraft,
  buildEmptyEntityCatalogSuggestions,
  buildEntityPayload,
  buildFallbackEntityDto,
  loadEntityEditorCatalogSuggestions,
  loadEntityEditorEntity,
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

describe('entity editor controller', () => {
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

  it('falls back to a reusable draft entity when the backend entity endpoint is missing', async () => {
    const apiGet = async () => {
      throw new Error('GET /entities/42 failed with 404');
    };

    await expect(loadEntityEditorEntity(apiGet as any, '42')).resolves.toEqual(buildFallbackEntityDto('42'));
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

  it('creates new entities and returns the translated success message', async () => {
    await expect(
      saveEntityPayload('new', baseDraft, {
        createEntity: async () => 42,
        updateEntity: async () => undefined,
        buildCreateSuccessMessage: id => `created:${id}`,
        saveSuccessMessage: 'saved'
      })
    ).resolves.toBe('created:42');
  });

  it('updates existing entities and returns the save-success message', async () => {
    await expect(
      saveEntityPayload('edit', baseDraft, {
        createEntity: async () => 42,
        updateEntity: async () => undefined,
        buildCreateSuccessMessage: id => `created:${id}`,
        saveSuccessMessage: 'saved'
      })
    ).resolves.toBe('saved');
  });
});
