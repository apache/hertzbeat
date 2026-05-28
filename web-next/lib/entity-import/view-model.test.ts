import { describe, expect, it, vi } from 'vitest';
import {
  buildActivityRows,
  buildImportMetrics,
  buildImportPreviewRows,
  buildImportQueueGroups,
  buildImportSummaryFacts,
  buildTemplateRows
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();
const zhT = createTranslatorMock({ locale: 'zh-CN' });

describe('entity import view model', () => {
  it('builds import metrics from template/activity state', () => {
    expect(buildImportMetrics({ format: 'yaml', templateCount: 3, activityCount: 2 }, t)).toEqual([
      { label: 'Import Format', value: 'YAML' },
      { label: 'Custom template', value: '3' },
      { label: 'Recent activity', value: '2' }
    ]);
  });

  it('builds template rows', () => {
    expect(
      buildTemplateRows(
        [
          { id: 1, name: 'base-template', summary: 'shared service template', format: 'yaml', source: 'workspace' }
        ] as any,
        t
      )
    ).toEqual([
      {
        key: '1',
        title: 'base-template',
        copy: 'shared service template',
        meta: 'YAML · Workspace'
      }
    ]);
  });

  it('builds activity rows', () => {
    expect(
      buildActivityRows(
        [
          { summary: 'imported service', detail: 'created from yaml', status: 'success', format: 'yaml' }
        ] as any,
        t
      )
    ).toEqual([
      {
        title: 'imported service',
        copy: 'created from yaml',
        meta: 'Success · YAML'
      }
    ]);
  });

  it('localizes known import activity copy for the cold zh-CN import workbench', () => {
    expect(
      buildActivityRows(
        [
          {
            summary: 'Telemetry discovery applied',
            detail: 'endpoint: Checkout · source: otel_resource · system: website · evidence: 1 monitor binds',
            status: 'SUCCESS',
            format: 'YAML'
          },
          {
            summary: 'Catalog entity updated',
            detail: 'service: checkout · owner: platform · environment: prod',
            status: 'success',
            format: 'yaml'
          },
          {
            summary: 'Catalog entity created',
            detail: 'service: checkout · source: manual · owner: platform',
            status: 'saved',
            format: 'yaml'
          }
        ] as any,
        zhT
      )
    ).toEqual([
      {
        title: '遥测发现已应用',
        copy: '端点: Checkout · 来源: otel_resource · 系统: website · 证据: 1 监控绑定',
        meta: '成功 · YAML'
      },
      {
        title: '目录实体已更新',
        copy: '服务: checkout · 负责人: platform · 环境: prod',
        meta: '成功 · YAML'
      },
      {
        title: '目录实体已创建',
        copy: '服务: checkout · 来源: manual · 负责人: platform',
        meta: '已保存 · YAML'
      }
    ]);
  });

  it('uses localized empty fallback for missing import titles, template metadata, and activity rows', () => {
    expect(
      buildTemplateRows(
        [
          {
            id: 9,
            name: 'empty-template',
            summary: ' ',
            kind: '',
            format: '',
            source: ''
          }
        ] as any,
        zhT
      )
    ).toEqual([
      {
        key: '9',
        title: 'empty-template',
        copy: '无',
        meta: '无 · 无'
      }
    ]);

    expect(
      buildActivityRows(
        [
          {
            summary: '',
            detail: ' ',
            status: '',
            format: ''
          }
        ] as any,
        zhT
      )
    ).toEqual([
      {
        title: '无',
        copy: '无',
        meta: '无 · 无'
      }
    ]);

    const missingTranslator = (key: string) => key;

    expect(
      buildImportPreviewRows(
        [
          {
            entity: {
              type: 'service',
              name: ' ',
              displayName: ' ',
              source: 'manual'
            },
            monitorBinds: [],
            identities: []
          }
        ] as any,
        zhT
      )[0]
    ).toEqual(expect.objectContaining({ title: '无' }));

    expect(
      buildActivityRows([{ summary: '', detail: '', status: '', format: '' }] as any, missingTranslator)
    ).toEqual([{ title: 'None', copy: 'None', meta: 'None · None' }]);
  });

  it('localizes unknown import activity status and template source fallbacks', () => {
    expect(
      buildActivityRows(
        [
          {
            summary: 'import deferred',
            detail: 'manual review',
            status: 'deferred',
            format: 'yaml'
          }
        ] as any,
        zhT
      )
    ).toEqual([
      {
        title: 'import deferred',
        copy: 'manual review',
        meta: '未知状态 deferred · YAML'
      }
    ]);

    expect(
      buildTemplateRows(
        [
          {
            id: 12,
            name: 'remote-template',
            summary: 'external registry template',
            format: 'json',
            source: 'remote-registry'
          }
        ] as any,
        zhT
      )
    ).toEqual([
      {
        key: '12',
        title: 'remote-template',
        copy: 'external registry template',
        meta: 'JSON · 未知来源 remote-registry'
      }
    ]);
  });

  it('localizes unknown import entity kind and source labels', () => {
    expect(
      buildImportPreviewRows(
        [
          {
            entity: {
              type: 'lambda_function',
              name: 'async-enricher',
              source: 'cloud-scanner',
              owner: 'platform',
              system: 'enrichment',
              runbook: 'https://runbooks.example.com/enrichment'
            },
            monitorBinds: [{ id: 7 }],
            identities: [{ key: 'service.name', value: 'async-enricher' }]
          }
        ] as any,
        zhT
      )[0]
    ).toEqual(
      expect.objectContaining({
        kindLabel: '未知类型 lambda_function',
        sourceLabel: '未知来源 cloud-scanner'
      })
    );
  });

  it('localizes unknown import definition format labels', () => {
    expect(buildImportMetrics({ format: 'toml' as any, templateCount: 1, activityCount: 0 }, zhT)).toEqual([
      { label: '导入格式', value: '未知格式 toml' },
      { label: '自定义模板', value: '1' },
      { label: '最近活动', value: '0' }
    ]);

    expect(
      buildActivityRows([{ summary: 'previewed custom format', detail: 'manual', status: 'preview', format: 'toml' }] as any, zhT)
    ).toEqual([
      {
        title: 'previewed custom format',
        copy: 'manual',
        meta: '预览 · 未知格式 toml'
      }
    ]);

    expect(
      buildTemplateRows([{ id: 15, name: 'toml-template', summary: ' ', kind: 'custom template', format: 'toml', source: 'custom' }] as any, zhT)
    ).toEqual([
      {
        key: '15',
        title: 'toml-template',
        copy: 'custom template',
        meta: '未知格式 toml · 自定义'
      }
    ]);
  });

  it('builds current preview rows from parsed entity definitions', () => {
    expect(
      buildImportPreviewRows(
        [
          {
            entity: {
              type: 'service',
              name: 'checkout-api',
              displayName: 'Checkout API',
              source: 'manual',
              owner: 'platform',
              system: 'commerce',
              runbook: 'https://runbooks.example.com/checkout'
            },
            monitorBinds: [{ id: 1 }],
            identities: []
          },
          {
            entity: {
              type: 'api',
              name: 'payments-api',
              source: 'manual'
            },
            monitorBinds: [],
            identities: []
          }
        ] as any,
        t
      )
    ).toEqual([
      expect.objectContaining({
        title: 'Checkout API',
        subtitle: 'checkout-api',
        telemetryLabel: 'Telemetry binding detected',
        attributionLabel: 'Attribution needs review',
        attributionState: 'review',
        gaps: [],
        validationLabel: 'Ready to import',
        readinessScore: 100,
        attributionRows: [
          expect.objectContaining({
            key: 'identity',
            title: 'Identities',
            copy: 'Missing identity',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'monitor-binding',
            title: 'Monitor binding',
            copy: '1 monitor bindings',
            meta: 'monitorId 1',
            state: 'ready'
          }),
          expect.objectContaining({
            key: 'ownership',
            title: 'Owner',
            copy: 'platform',
            state: 'ready'
          }),
          expect.objectContaining({
            key: 'system-environment',
            title: 'System and environment',
            copy: 'commerce · missing environment',
            state: 'review'
          }),
          expect.objectContaining({
            key: 'discovery-return',
            title: 'Discovery loop',
            href: '/entities/discovery?source=telemetry&monitorId=1'
          })
        ]
      }),
      expect.objectContaining({
        title: 'payments-api',
        sourceLabel: 'Manual',
        attributionLabel: 'Attribution missing',
        attributionState: 'missing',
        gapKeys: ['owner', 'system', 'implementedBy', 'telemetry', 'runbook'],
        gaps: ['Owner', 'System', 'Implemented by', 'Telemetry bindings', 'Runbook'],
        validationLabel: 'Needs details before import',
        readinessScore: 0,
        attributionRows: expect.arrayContaining([
          expect.objectContaining({
            key: 'identity',
            copy: 'Missing identity',
            meta: 'Waiting for service.name or hertzbeat.entity_id',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'monitor-binding',
            copy: '0 monitor bindings',
            meta: 'Waiting for monitor object or template binding',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'ownership',
            copy: 'Missing owner',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'system-environment',
            copy: 'Missing system and environment',
            state: 'review'
          })
        ])
      })
    ]);
  });

  it('summarizes import preview facts for ready, attention, and telemetry pending groups', () => {
    const rows = buildImportPreviewRows(
      [
        {
          entity: { type: 'service', name: 'ready-service', owner: 'platform', system: 'commerce', runbook: 'https://runbooks.example.com' },
          monitorBinds: [{ id: 1 }],
          identities: []
        },
        {
          entity: { type: 'service', name: 'needs-telemetry', owner: 'platform', system: 'commerce' },
          monitorBinds: [],
          identities: []
        }
      ] as any,
      t
    );

    expect(buildImportSummaryFacts(rows, t)).toEqual([
      { label: 'Ready to import', value: '1' },
      { label: 'Needs attention', value: '1' },
      { label: 'Telemetry still missing', value: '1' }
    ]);
  });

  it('builds queue groups that match the entity import workbench posture', () => {
    const rows = buildImportPreviewRows(
      [
        {
          entity: { type: 'service', name: 'ready-service', owner: 'platform', system: 'commerce', runbook: 'https://runbooks.example.com' },
          monitorBinds: [{ id: 1 }],
          identities: []
        },
        {
          entity: { type: 'service', name: 'needs-owner', system: 'commerce', runbook: 'https://runbooks.example.com' },
          monitorBinds: [{ id: 1 }],
          identities: []
        },
        {
          entity: { type: 'service', name: 'needs-telemetry', owner: 'platform', system: 'commerce', runbook: 'https://runbooks.example.com' },
          monitorBinds: [],
          identities: []
        }
      ] as any,
      t
    );

    expect(buildImportQueueGroups(rows, t)).toEqual([
      expect.objectContaining({
        key: 'ready',
        title: 'Ready to import',
        actionLabel: 'View ready definitions',
        scope: 'ready'
      }),
      expect.objectContaining({
        key: 'attention',
        title: 'Needs attention first',
        actionLabel: 'View blocked definitions',
        scope: 'attention'
      }),
      expect.objectContaining({
        key: 'telemetry',
        title: 'Still needs telemetry after import',
        actionLabel: 'View telemetry-pending definitions',
        scope: 'telemetry'
      })
    ]);
  });
});
