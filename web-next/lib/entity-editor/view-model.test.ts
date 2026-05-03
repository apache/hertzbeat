import { describe, expect, it } from 'vitest';
import {
  buildEntityEditorAttributionRows,
  buildEntityEditorCatalogRows,
  buildEntityEditorFacts,
  buildEntityEditorNextStepRows,
  buildEntityEditorSuggestions,
  buildEntityEditorTitle
} from './view-model';

describe('entity editor view model', () => {
  it('builds the page title for create and edit flows', () => {
    expect(
      buildEntityEditorTitle('new', undefined, {
        newTitle: 'Create entity',
        editTitle: entityId => `Edit entity · ${entityId}`
      })
    ).toBe('Create entity');

    expect(
      buildEntityEditorTitle('edit', '42', {
        newTitle: 'Create entity',
        editTitle: entityId => `Edit entity · ${entityId}`
      })
    ).toBe('Edit entity · 42');
  });

  it('builds editor facts for existing entities', () => {
    expect(
      buildEntityEditorFacts(
        'edit',
        '42',
        { type: 'service', owner: 'platform', system: 'commerce' },
        { workspace: 'Workspace', type: 'Type', owner: 'Owner', system: 'System' }
      )
    ).toEqual([
      { label: 'Workspace', value: 'entities/42/edit' },
      { label: 'Type', value: 'service' },
      { label: 'Owner', value: 'platform' },
      { label: 'System', value: 'commerce' }
    ]);
  });

  it('builds catalog suggestion rows from derived suggestions', () => {
    expect(
      buildEntityEditorCatalogRows(
        { owners: ['platform', 'ops'], systems: ['commerce'], environments: ['prod'] },
        {
          ownerSuggestions: ['platform'],
          systemSuggestions: ['commerce'],
          environmentSuggestions: ['prod'],
          lifecycleSuggestions: ['production'],
          tierSuggestions: ['tier-1']
        },
        {
          owners: 'owners',
          systems: 'systems',
          environments: 'environments',
          lifecycleTier: 'lifecycles / tiers',
          count: count => `count ${count}`,
          seed: 'catalog seed'
        }
      )
    ).toEqual([
      { title: 'owners', copy: 'platform', meta: 'count 2' },
      { title: 'systems', copy: 'commerce', meta: 'count 1' },
      { title: 'environments', copy: 'prod', meta: 'count 1' },
      { title: 'lifecycles / tiers', copy: 'production · tier-1', meta: 'catalog seed' }
    ]);
  });

  it('derives bounded catalog suggestions', () => {
    expect(
      buildEntityEditorSuggestions({
        owners: ['platform', 'platform', 'ops'],
        systems: ['commerce'],
        environments: ['prod'],
        lifecycles: ['production'],
        tiers: ['tier-1'],
        languages: ['java'],
        linkProviders: ['grafana']
      })
    ).toEqual({
      ownerSuggestions: ['platform', 'ops'],
      systemSuggestions: ['commerce'],
      environmentSuggestions: ['prod'],
      lifecycleSuggestions: ['production'],
      tierSuggestions: ['tier-1'],
      languageSuggestions: ['java'],
      providerSuggestions: ['grafana']
    });
  });

  it('builds next-step rows for create and edit flows', () => {
    expect(
      buildEntityEditorNextStepRows('new', undefined, {
        importTitle: 'Import from definition',
        importCopy: 'Import copy',
        reviewTitle: 'Review definition',
        reviewCopy: 'Review copy',
        discoveryTitle: 'Discovery governance',
        discoveryCopy: 'Discovery copy'
      })
    ).toEqual([
      { title: 'Import from definition', copy: 'Import copy', meta: '/entities/import' },
      { title: 'Discovery governance', copy: 'Discovery copy', meta: '/entities/discovery' }
    ]);

    expect(
      buildEntityEditorNextStepRows('edit', '42', {
        importTitle: 'Import from definition',
        importCopy: 'Import copy',
        reviewTitle: 'Review definition',
        reviewCopy: 'Review copy',
        discoveryTitle: 'Discovery governance',
        discoveryCopy: 'Discovery copy'
      })
    ).toEqual([
      { title: 'Review definition', copy: 'Review copy', meta: '/entities/42/definition' },
      { title: 'Discovery governance', copy: 'Discovery copy', meta: '/entities/discovery' }
    ]);
  });

  it('builds attribution rows for a telemetry-seeded entity draft', () => {
    expect(
      buildEntityEditorAttributionRows({
        entity: {
          source: 'otel_resource',
          owner: 'platform',
          system: 'commerce',
          environment: 'prod'
        },
        identities: [{ identityKey: 'service.name', identityValue: 'checkout' }],
        monitorBinds: [{ monitorId: 42, bindType: 'suggested' }]
      })
    ).toEqual([
      {
        key: 'identity',
        title: '身份标识',
        copy: '1 个身份标识',
        meta: 'service.name=checkout',
        state: 'ready'
      },
      {
        key: 'monitor-binding',
        title: '监控绑定',
        copy: '1 个监控绑定',
        meta: 'monitorId 42',
        state: 'ready'
      },
      {
        key: 'ownership',
        title: '负责人',
        copy: 'platform',
        meta: '可追责',
        state: 'ready'
      },
      {
        key: 'system-environment',
        title: '系统与环境',
        copy: 'commerce · prod',
        meta: '用于告警收敛和拓扑',
        state: 'ready'
      },
      {
        key: 'discovery-return',
        title: '发现回路',
        copy: '可回到遥测发现',
        meta: '/entities/discovery?source=telemetry&monitorId=42',
        state: 'ready',
        href: '/entities/discovery?source=telemetry&monitorId=42'
      }
    ]);
  });

  it('marks missing attribution before a telemetry draft is saved as a clean entity', () => {
    expect(
      buildEntityEditorAttributionRows({
        entity: {
          source: 'otel_resource',
          system: 'checkout'
        },
        identities: [],
        monitorBinds: []
      })
    ).toEqual([
      {
        key: 'identity',
        title: '身份标识',
        copy: '缺少身份标识',
        meta: '等待 service.name 或 hertzbeat.entity_id',
        state: 'missing'
      },
      {
        key: 'monitor-binding',
        title: '监控绑定',
        copy: '0 个监控绑定',
        meta: '等待监控对象或模板绑定',
        state: 'missing'
      },
      {
        key: 'ownership',
        title: '负责人',
        copy: '缺少负责人',
        meta: '先补负责人或值班组',
        state: 'missing'
      },
      {
        key: 'system-environment',
        title: '系统与环境',
        copy: 'checkout · 缺少环境',
        meta: '用于告警收敛和拓扑',
        state: 'review'
      },
      {
        key: 'discovery-return',
        title: '发现回路',
        copy: '可回到遥测发现',
        meta: '/entities/discovery',
        state: 'review',
        href: '/entities/discovery'
      }
    ]);
  });
});
