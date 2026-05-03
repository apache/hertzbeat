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
        ] as any
      )
    ).toEqual([
      {
        key: '1',
        title: 'base-template',
        copy: 'shared service template',
        meta: 'YAML · 工作区'
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
        meta: '成功 · YAML'
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
        t
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
        attributionLabel: '归因待确认',
        attributionState: 'review',
        gaps: [],
        validationLabel: 'Ready to import',
        readinessScore: 100,
        attributionRows: [
          expect.objectContaining({
            key: 'identity',
            title: '身份标识',
            copy: '缺少身份标识',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'monitor-binding',
            title: '监控绑定',
            copy: '1 个监控绑定',
            meta: 'monitorId 1',
            state: 'ready'
          }),
          expect.objectContaining({
            key: 'ownership',
            title: '负责人',
            copy: 'platform',
            state: 'ready'
          }),
          expect.objectContaining({
            key: 'system-environment',
            title: '系统与环境',
            copy: 'commerce · 缺少环境',
            state: 'review'
          }),
          expect.objectContaining({
            key: 'discovery-return',
            title: '发现回路',
            href: '/entities/discovery?source=telemetry&monitorId=1'
          })
        ]
      }),
      expect.objectContaining({
        title: 'payments-api',
        sourceLabel: 'Manual',
        attributionLabel: '归因缺失',
        attributionState: 'missing',
        gapKeys: ['owner', 'system', 'implementedBy', 'telemetry', 'runbook'],
        gaps: ['Owner', 'System', 'Implemented by', 'Telemetry bindings', 'Runbook'],
        validationLabel: 'Needs details before import',
        readinessScore: 0,
        attributionRows: expect.arrayContaining([
          expect.objectContaining({
            key: 'identity',
            copy: '缺少身份标识',
            meta: '等待 service.name 或 hertzbeat.entity_id',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'monitor-binding',
            copy: '0 个监控绑定',
            meta: '等待监控对象或模板绑定',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'ownership',
            copy: '缺少负责人',
            state: 'missing'
          }),
          expect.objectContaining({
            key: 'system-environment',
            copy: '缺少系统、环境',
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
