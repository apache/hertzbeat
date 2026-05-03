/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { EntityDetail, EntityDto } from '../../../pojo/EntityDetail';
import { AlertInhibitService } from '../../../service/alert-inhibit.service';
import { AlertService } from '../../../service/alert.service';
import { AlertSilenceService } from '../../../service/alert-silence.service';
import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';
import { EntityDetailComponent } from './entity-detail.component';

describe('EntityDetailComponent workspace chrome', () => {
  function createPage<T>(content: T[] = []) {
    return {
      content,
      totalPages: 1,
      totalElements: content.length,
      size: 10,
      number: 0,
      numberOfElements: content.length
    };
  }

  function createComponent(translations: Record<string, string> = {}) {
    const route = {
      snapshot: { queryParams: {} },
      paramMap: of(convertToParamMap({ entityId: '42' })),
      queryParamMap: of(convertToParamMap({}))
    } as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], {
      url: '/entities/42'
    });
    const component = new EntityDetailComponent(
      route,
      router,
      jasmine.createSpyObj<Location>('Location', ['back']),
      jasmine.createSpyObj<EntityService>('EntityService', ['getEntityDetail']),
      jasmine.createSpyObj<AlertService>('AlertService', ['loadAlerts']),
      jasmine.createSpyObj<AlertSilenceService>('AlertSilenceService', ['getAlertSilences']),
      jasmine.createSpyObj<AlertInhibitService>('AlertInhibitService', ['getAlertInhibits']),
      jasmine.createSpyObj<MonitorService>('MonitorService', ['searchMonitors']),
      jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm', 'create']),
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning', 'error']),
      jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck', 'detectChanges']),
      { fanyi: (key: string, values?: Record<string, unknown>) => {
        const template = translations[key] ?? key;
        return values == null
          ? template
          : template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => String(values[token] ?? ''));
      } } as any,
      new OpsWorkspaceFacade()
    );
    component.entityId = 42;
    spyOn(component, 'getLogManageQueryParams').and.returnValue({ entityId: '42', entityName: 'checkout-api' });
    spyOn<any>(component, 'loadGovernancePresets').and.stub();
    spyOn<any>(component, 'loadEntityDetail').and.stub();
    return { component, router };
  }

  it('should expose entity as the active workspace tab', () => {
    const { component } = createComponent();

    expect(component.workspaceTabs.find(tab => tab.key === 'entity')?.active).toBeTrue();
    expect(component.workspaceTabs.find(tab => tab.key === 'logs')?.active).toBeFalse();
  });

  it('should navigate to the log workspace with the current handoff query', () => {
    const { component, router } = createComponent();

    component.onWorkspaceTabSelect('logs');

    expect(router.navigate).toHaveBeenCalledWith(['/log/manage'], {
      queryParams: { entityId: '42', entityName: 'checkout-api' }
    });
  });

  it('should navigate to the OTLP metrics console with the current telemetry handoff query', () => {
    const { component, router } = createComponent();
    spyOn(component, 'getMetricsConsoleQueryParams').and.returnValue({
      entityId: '42',
      entityName: 'checkout-api',
      serviceName: 'checkout',
      serviceNamespace: 'commerce'
    });

    component.openMetricsConsole();

    expect(router.navigate).toHaveBeenCalledWith(['/ingestion/otlp/metrics'], {
      queryParams: {
        entityId: '42',
        entityName: 'checkout-api',
        serviceName: 'checkout',
        serviceNamespace: 'commerce'
      }
    });
  });

  it('should keep the workspace rail disabled once detail data is loaded', () => {
    const { component } = createComponent();
    const detail = new EntityDetail();
    detail.entity = {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service'
      }
    } as EntityDto;
    component.detail = detail;

    expect(component.showWorkspaceRail).toBeFalse();
  });

  it('should read workspace labels from i18n keys instead of English fallbacks', () => {
    const { component } = createComponent({
      'entity.detail': '实体详情',
      'entity.detail.help': '实体详情说明',
      'entity.detail.not-found': '实体不存在。',
      'entity.detail.quick.owner.missing': '缺少负责人',
      'entity.detail.quick.runbook.missing': '缺少处置手册',
      'entity.detail.quick.evidence.missing': '待补充证据',
      'entity.detail.quick.definition.draft': '定义草稿',
      'entity.detail.ops.pending': '待补齐',
      'entity.field.owner': '负责人',
      'entity.field.runbook': '处置手册',
      'entity.guide.evidence': '证据',
      'entity.section.relations': '关系'
    });

    component.ngOnInit();

    expect(component.moduleName).toBe('实体详情');
    expect(component.helpMessageContent).toBe('实体详情说明');
    expect(component.getOwnerReadinessLabel()).toBe('缺少负责人');
    expect(component.getRunbookReadinessLabel()).toBe('缺少处置手册');
    expect(component.getEvidenceReadinessLabel()).toBe('待补充证据');
    expect(component.getDefinitionReadinessLabel()).toBe('定义草稿');
    expect((component as any).getOpsReadinessSummary()).toBe('待补齐 负责人、处置手册、证据、关系');
    expect((component as any).resolveEntityDetailMessage('Entity not exist.')).toBe('实体不存在。');
  });

  it('should publish the current entity and list query context to the global workspace facade', () => {
    const route = {
      snapshot: { queryParams: {} },
      paramMap: of(convertToParamMap({ entityId: '42' })),
      queryParamMap: of(convertToParamMap({ status: 'degraded', owner: 'platform' }))
    } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'], {
      url: '/entities/42?status=degraded'
    });
    const entitySvc = jasmine.createSpyObj<EntityService>('EntityService', [
      'getEntityDetail',
      'getDiscoveryGovernanceActivities',
      'getDiscoveryGovernancePresets',
      'getDefinitionWorkspaceActivities',
      'getEntityDefinition',
      'getEntityAlerts',
      'getEntityMonitors',
      'searchEntitiesByIds',
      'searchEntities'
    ]);
    const workspace = new OpsWorkspaceFacade();
    const detail = new EntityDetail();
    detail.entity = {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service'
      }
    } as EntityDto;
    entitySvc.getEntityDetail.and.returnValue(of({ code: 0, msg: '', data: detail }));
    entitySvc.getDiscoveryGovernanceActivities.and.returnValue(of({ code: 0, msg: '', data: [] }));
    entitySvc.getDiscoveryGovernancePresets.and.returnValue(of({ code: 0, msg: '', data: [] }));
    entitySvc.getDefinitionWorkspaceActivities.and.returnValue(of({ code: 0, msg: '', data: [] }));
    entitySvc.getEntityDefinition.and.returnValue(of({ code: 0, msg: '', data: 'kind: service' }));
    entitySvc.getEntityAlerts.and.returnValue(of({ code: 0, msg: '', data: createPage<any>() }));
    entitySvc.getEntityMonitors.and.returnValue(of({ code: 0, msg: '', data: createPage<any>() }));
    entitySvc.searchEntitiesByIds.and.returnValue(of({ code: 0, msg: '', data: createPage<any>() }));
    entitySvc.searchEntities.and.returnValue(of({ code: 0, msg: '', data: createPage<any>() }));

    const component = new EntityDetailComponent(
      route,
      router,
      jasmine.createSpyObj<Location>('Location', ['back', 'replaceState']),
      entitySvc,
      jasmine.createSpyObj<AlertService>('AlertService', ['loadAlerts']),
      jasmine.createSpyObj<AlertSilenceService>('AlertSilenceService', ['getAlertSilences']),
      jasmine.createSpyObj<AlertInhibitService>('AlertInhibitService', ['getAlertInhibits']),
      jasmine.createSpyObj<MonitorService>('MonitorService', ['searchMonitors']),
      jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm', 'create']),
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'warning', 'error']),
      jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck', 'detectChanges']),
      { fanyi: (key: string) => key } as any,
      workspace
    );

    component.ngOnInit();

    expect(workspace.selectedEntity()).toEqual({
      id: '42',
      name: 'Checkout API',
      type: 'service'
    });
    expect(workspace.queryContext()).toEqual({
      route: '/entities/42',
      params: {
        status: 'degraded',
        owner: 'platform'
      }
    });
  });

  it('should project recommended actions into the shared workspace guidance model', () => {
    const { component } = createComponent();
    spyOnProperty(component, 'recommendedActions', 'get').and.returnValue([
      {
        key: 'owner',
        title: '下一步：补充负责人',
        description: '先补齐 owner，后续日志和告警才有清晰归属。',
        actionLabel: '去补负责人',
        icon: 'user',
        tone: 'primary'
      },
      {
        key: 'definition',
        title: '下一步：审阅定义',
        description: '继续查看定义质量。',
        actionLabel: '编辑定义',
        icon: 'code',
        tone: 'default'
      }
    ] as any);

    expect(component.workspaceGuidanceHeadline).toBe('下一步：补充负责人');
    expect(component.workspaceGuidancePrimaryAction?.key).toBe('owner');
    expect(component.workspaceGuidanceSecondaryAction?.key).toBe('definition');
  });

  it('should expose fallback next links when there are not enough recommended actions', () => {
    const { component } = createComponent();
    spyOnProperty(component, 'recommendedActions', 'get').and.returnValue([
      {
        key: 'owner',
        title: '下一步：补充负责人',
        description: '先补齐 owner，后续日志和告警才有清晰归属。',
        actionLabel: '去补负责人',
        icon: 'user',
        tone: 'primary'
      }
    ] as any);

    expect(component.workspaceGuidanceNextLinks.map(item => item.key)).toEqual(['definition-preview', 'logs', 'traces']);
  });

  it('should expose shared support facts for the entity guidance panel', () => {
    const { component } = createComponent();
    spyOn(component, 'getStatusNarrative').and.returnValue('证据不足，需要继续调查');
    spyOnProperty(component, 'workspaceReadinessLabel', 'get').and.returnValue('待补齐');
    spyOnProperty(component, 'lastEvidenceAtLabel', 'get').and.returnValue('2026-03-30 09:00');

    expect(component.workspaceGuidanceFacts).toEqual([
      { label: '当前状态', value: '证据不足，需要继续调查', tone: 'warning' },
      { label: '证据更新时间', value: '2026-03-30 09:00' },
      { label: '状态完整度', value: '待补齐', tone: 'accent' }
    ]);
  });

  it('should expose shared response readiness items for the support fact grid', () => {
    const { component } = createComponent({
      'entity.detail.quick.owner.missing': '缺少负责人',
      'entity.detail.quick.runbook.missing': '缺少处置手册',
      'entity.detail.status-page.none': '未配置状态页'
    });
    component.detail = {
      entity: {
        entity: {
          id: 42,
          name: 'checkout-api',
          system: 'commerce'
        }
      }
    } as any;

    expect(component.responseReadinessItems).toEqual([
      { label: 'entity.field.owner', value: '缺少负责人' },
      { label: 'entity.field.runbook', value: '缺少处置手册' },
      { label: 'entity.field.system', value: 'commerce' },
      { label: 'entity.detail.status-page', value: '未配置状态页' }
    ]);
  });

  it('should build object-centered related signal cards for logs, traces, and metrics', () => {
    const { component } = createComponent({
      'entity.detail.related-signals.logs.title': '相关日志',
      'entity.detail.related-signals.traces.title': '相关链路',
      'entity.detail.related-signals.metrics.title': '相关指标',
      'entity.detail.related-signals.preview.query': '查询',
      'entity.detail.related-signals.preview.hints': '线索数',
      'entity.detail.related-signals.preview.source': '来源',
      'entity.detail.related-signals.preview.trace-count': '链路数',
      'entity.detail.related-signals.preview.error-traces': '错误链路',
      'entity.detail.related-signals.preview.metric': '指标',
      'entity.detail.related-signals.preview.value': '当前值',
      'entity.detail.related-signals.open': '在工作台中打开'
    });
    const detail = new EntityDetail();
    detail.entity = {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service'
      }
    } as EntityDto;
    detail.logSummary = {
      hintCount: 3,
      preferredQueryTitle: 'checkout errors'
    } as any;
    detail.traceSummary = {
      recentTraceCount: 2,
      recentErrorTraceCount: 1
    } as any;
    detail.metricEvidence = [
      {
        displayName: 'CPU Usage',
        metricName: 'system.cpu.utilization',
        source: 'otlp',
        signal: 'metrics',
        value: 72
      } as any
    ];
    component.detail = detail;

    const cards = component.relatedSignalCards;

    expect(cards).toEqual([
      jasmine.objectContaining({
        key: 'logs',
        title: '相关日志',
        count: 3,
        previewItems: [
          { label: '查询', value: 'checkout errors' },
          { label: '线索数', value: '3' },
          { label: '来源', value: 'OTel/OTLP' }
        ],
        actionLabel: '在工作台中打开'
      }),
      jasmine.objectContaining({
        key: 'traces',
        title: '相关链路',
        count: 2,
        previewItems: [
          { label: '链路数', value: '2' },
          { label: '错误链路', value: '1' }
        ],
        actionLabel: '在工作台中打开'
      }),
      jasmine.objectContaining({
        key: 'metrics',
        title: '相关指标',
        count: 1,
        previewItems: [
          { label: '指标', value: 'CPU Usage' },
          { label: '来源', value: 'OTLP' },
          { label: '当前值', value: '72' }
        ],
        actionLabel: '在工作台中打开'
      })
    ]);

    const [logsCard, tracesCard, metricsCard] = cards as Array<{ previewChartOption?: { series?: unknown[]; dataZoom?: unknown[] } }>;
    expect(logsCard.previewChartOption?.series?.length).toBeGreaterThan(0);
    expect(tracesCard.previewChartOption?.series?.length).toBeGreaterThan(0);
    expect(metricsCard.previewChartOption?.series?.length).toBeGreaterThan(0);
    expect(metricsCard.previewChartOption?.dataZoom?.length).toBe(1);
  });

  it('should expose preview rows for every related signal card', () => {
    const detail = new EntityDetail();
    detail.entity = {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service'
      }
    } as EntityDto;
    detail.logSummary = {
      hintCount: 3,
      preferredQueryTitle: 'checkout errors'
    } as any;
    detail.traceSummary = {
      recentTraceCount: 2,
      recentErrorTraceCount: 1
    } as any;
    detail.metricEvidence = [
      {
        displayName: 'CPU Usage',
        metricName: 'system.cpu.utilization',
        source: 'otlp',
        signal: 'metrics',
        value: 72
      } as any
    ];

    const { component } = createComponent({
      'entity.detail.related-signals.logs.title': '相关日志',
      'entity.detail.related-signals.traces.title': '相关链路',
      'entity.detail.related-signals.metrics.title': '相关指标',
      'entity.detail.related-signals.preview.query': '查询',
      'entity.detail.related-signals.preview.hints': '线索数',
      'entity.detail.related-signals.preview.source': '来源',
      'entity.detail.related-signals.preview.trace-count': '链路数',
      'entity.detail.related-signals.preview.error-traces': '错误链路',
      'entity.detail.related-signals.preview.metric': '指标',
      'entity.detail.related-signals.preview.value': '当前值',
      'entity.detail.related-signals.open': '在工作台中打开'
    });
    component.detail = detail;

    expect(component.relatedSignalCards.map(card => card.previewItems.length)).toEqual([3, 2, 3]);
  });

  it('should expose shared summary metric items for alerts, monitors, logs, and traces', () => {
    const { component } = createComponent({
      'entity.section.alerts': '告警',
      'entity.detail.stat.monitor-down': '异常监控',
      'entity.section.logs': '日志',
      'entity.section.traces': '链路',
      'entity.detail.related-signals.open': '打开'
    });
    const detail = new EntityDetail();
    detail.evidenceSummary = {
      activeAlertCount: 4,
      downMonitorCount: 2,
      logHintCount: 3
    } as any;
    detail.traceSummary = {
      recentTraceCount: 5
    } as any;
    component.detail = detail;

    expect(component.summaryMetricItems).toEqual([
      { label: '告警', value: '4', actionLabel: '打开', actionKey: 'alerts' },
      { label: '异常监控', value: '2', actionLabel: '打开', actionKey: 'monitors', tone: 'warning' },
      { label: '日志', value: '3', actionLabel: '打开', actionKey: 'logs' },
      { label: '链路', value: '5', actionLabel: '打开', actionKey: 'traces' }
    ]);
  });

  it('should route summary strip actions to the matching workbench', () => {
    const { component } = createComponent();
    spyOn(component, 'openAlertsWorkbench');
    spyOn(component, 'openMonitorsWorkbench');
    spyOn(component, 'openLogManage');
    spyOn(component, 'openTraceCenter');

    component.openSummaryStripItem('alerts');
    component.openSummaryStripItem('monitors');
    component.openSummaryStripItem('logs');
    component.openSummaryStripItem('traces');

    expect(component.openAlertsWorkbench).toHaveBeenCalled();
    expect(component.openMonitorsWorkbench).toHaveBeenCalled();
    expect(component.openLogManage).toHaveBeenCalled();
    expect(component.openTraceCenter).toHaveBeenCalled();
  });

  it('should expose focus summary items and follow-up actions for the object-centered hero card', () => {
    const { component } = createComponent({
      'entity.detail.focus.metrics.catalog': '目录状态',
      'entity.detail.focus.metrics.done': '已完成',
      'entity.detail.focus.metrics.pending': '待补齐',
      'entity.catalog.ready': '已就绪'
    });
    const detail = new EntityDetail();
    detail.opsSummary = {
      readinessScore: 75
    } as any;
    detail.evidenceSummary = {
      lastEvidenceAt: '2026-03-30T09:00:00Z'
    } as any;
    detail.entity = {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        owner: 'platform',
        runbook: 'https://runbooks.internal/checkout',
        system: 'commerce',
        lifecycle: 'production',
        tier: 'tier-1'
      },
      identities: [{ id: 1, identityType: 'service.name', identityKey: 'service.name', identityValue: 'checkout' }],
      relations: [{ relationType: 'depends_on', sourceEntityId: 42, targetEntityId: 7 }]
    } as any;
    detail.status = {
      reason: '链路延迟上升'
    } as any;
    component.detail = detail;
    component.checklistItemsCache = [
      { title: '负责人', description: '', done: true },
      { title: '处置手册', description: '', done: true },
      { title: '证据', description: '', done: true },
      { title: '关系', description: '', done: true }
    ] as any;
    spyOnProperty(component, 'topRecommendedActions', 'get').and.returnValue([
      {
        key: 'logs',
        title: '先看日志',
        description: '先确认错误日志。',
        actionLabel: '打开日志工作台',
        icon: 'file-search',
        tone: 'primary'
      },
      {
        key: 'definition',
        title: '审阅定义',
        description: '检查定义质量。',
        actionLabel: '编辑定义',
        icon: 'code',
        tone: 'default'
      },
      {
        key: 'runbook',
        title: '补处置手册',
        description: '增加恢复入口。',
        actionLabel: '补处置手册',
        icon: 'book',
        tone: 'default'
      }
    ] as any);

    expect(component.primaryFocusSummaryItems.map(item => item.label)).toEqual(['当前状态', '证据更新时间', '进展']);
    expect(component.focusSupportActions.map(item => item.key)).toEqual(['definition', 'runbook']);
    expect(component.focusSupportMetrics).toEqual([
      { label: '目录状态', value: '已就绪' },
      { label: '已完成', value: '4/4' },
      { label: '待补齐', value: '0' }
    ]);
  });

  it('should switch to the relations workbench when relation updates return from the editor', () => {
    const { component } = createComponent({
      'entity.detail.response-result.relations.update': '已更新 {{count}} 条关系'
    });

    (component as any).hydrateResponseResultBanner({
      responseResultKind: 'relations',
      responseResultAction: 'update',
      responseResultCount: '2'
    });

    expect(component.activeTabIndex).toBe((component as any).relationsTabIndex);
    expect(component.hasResponseResultBanner).toBeTrue();
    expect(component.responseResultBannerTitle).toBe('已更新 2 条关系');
  });

  it('should expose related signal cards with the current log, trace and metric evidence counts', () => {
    const { component } = createComponent();
    component.detail = {
      logSummary: {
        preferredQueryTitle: 'checkout-api errors',
        hintCount: 2
      },
      traceSummary: {
        recentTraceCount: 5,
        recentErrorTraceCount: 1,
        latestObservedAt: '2026-03-30T09:00:00Z'
      },
      metricEvidence: [
        {
          displayName: 'p95 latency',
          metricName: 'http.server.duration',
          source: 'otlp'
        }
      ],
      unifiedEvidenceSummary: {
        metricEvidenceCount: 1
      }
    } as any;

    const cards = component.relatedSignalCards;

    expect(cards.map(card => card.key)).toEqual(['logs', 'traces', 'metrics']);
    expect(cards.map(card => card.count)).toEqual([2, 5, 1]);
    expect(cards[0].previewItems[0].value).toBe('checkout-api errors');
    expect(cards[1].previewItems[1].value).toBe('1');
    expect(cards[2].previewItems[0].value).toBe('p95 latency');
  });

  it('should expose shared definition preview facts for the definition drawer summary', () => {
    const { component } = createComponent();
    component.definitionPreviewFormat = 'json';
    component.detail = {
      boundMonitors: [{ id: 1 }],
      entity: {
        identities: [{ identityKey: 'service.name', identityValue: 'checkout' }],
        entity: {
          links: [{ title: 'runbook', url: 'https://example.com' }],
          contacts: [{ name: 'oncall', value: 'platform' }]
        }
      }
    } as any;
    component.outboundRelationList = [{ sourceEntityId: 42, targetEntityId: 7 } as any];
    component.inboundRelationList = [{ sourceEntityId: 8, targetEntityId: 42 } as any];

    expect(component.definitionPreviewFacts).toEqual([
      { label: 'entity.definition.preview-format', value: 'JSON' },
      { label: 'entity.section.identities', value: '1' },
      { label: 'entity.section.monitors', value: '1' },
      { label: 'entity.section.relations', value: '4' }
    ]);
    expect(component.definitionPreviewToolbarBadges).toEqual(['JSON']);
  });

  it('should expose a shared definition preview section title', () => {
    const { component } = createComponent({
      'entity.definition.title': '实体定义预览'
    });

    expect(component.definitionPreviewSectionTitle).toBe('实体定义预览');
  });
});
