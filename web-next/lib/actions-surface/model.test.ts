import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  buildActionApprovalDecision,
  buildActionApprovalDraft,
  buildActionApprovalDraftQueue,
  buildActionCatalogReadAdapter,
  buildActionsDomainModel,
  buildAutomationActionCatalogReview,
  buildSuggestedRemediationActions
} from './model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('actions domain model', () => {
  it('builds a domain-specific automation workspace snapshot', () => {
    const model = buildActionsDomainModel(t);

    expect(model.title).toBe('自动化处置');
    expect(model.tags).toEqual(['自动化目录', '风险感知动作', '审批流']);
    expect(model.catalog).toHaveLength(3);
    expect(model.catalog[0]).toMatchObject({
      name: '重启 checkout 部署',
      category: '运行时恢复',
      scope: '服务 checkout / prod-ap',
      owner: '平台运维',
      lastRun: '12 分钟前',
      posture: '需要审批和回滚说明'
    });
    expect(model.runs[0]?.status).toBe('awaiting-approval');
    expect(model.runs[0]).toMatchObject({
      name: '重启 checkout 部署',
      target: 'checkout / prod-ap',
      actor: 'li.na',
      duration: '待审批'
    });
    expect(model.approvals[0]?.status).toBe('pending');
    expect(model.approvals[0]).toMatchObject({
      summary: '重启生产 checkout Pod 以处理饱和告警突增',
      owner: 'checkout-oncall',
      evidence: '已附加告警风暴和链路延迟回退证据。'
    });
    expect(model.metrics).toEqual([
      { label: '目录动作', value: '3' },
      { label: '待审批', value: '1' },
      { label: '近期执行', value: '3' },
      { label: '高风险动作', value: '1' }
    ]);
    expect(model.checklist.map(item => item.meta)).toEqual(['已完成', '下一步', '预留']);
    expect(model.nextHops.map(item => item.label)).toEqual(['打开总览', '实体中心', '监控中心']);
    expect(model.nextHops.map(item => item.href)).toEqual(['/overview', '/entities', '/monitors']);
  });

  it('marks catalog, run, and approval snapshots as roadmap demo data until adapters land', () => {
    const model = buildActionsDomainModel(t);

    expect(model.adapterBoundary).toMatchObject({
      state: 'adapter-pending',
      label: '执行边界',
      liveHandoff: 'alert-context-suggestions'
    });
    expect(model.adapterBoundary.copy).toContain('roadmap 示例快照');
    expect(model.adapterBoundary.copy).toContain('不代表实时运行状态');
    expect(model.adapterBoundary.copy).toContain('人工交接');
    expect(model.adapterBoundary.roadmapOnly).toEqual([
      'workflow-automation',
      'action-catalog',
      'app-builder',
      'self-service-actions',
      'approvals',
      'scripts',
      'runbook-orchestration'
    ]);
    expect(model.adapterBoundary.roadmapOnlyLabels).toEqual([
      '工作流自动化',
      '动作目录',
      '应用编排器',
      '自助动作',
      '审批流',
      '脚本执行',
      '处置手册编排'
    ]);
    expect(model.catalog.every(item => item.snapshotState === 'roadmap-demo')).toBe(true);
    expect(model.runs.every(item => item.snapshotState === 'roadmap-demo')).toBe(true);
    expect(model.approvals.every(item => item.snapshotState === 'roadmap-demo')).toBe(true);
    expect(model.suggestedActions).toEqual([]);
  });

  it('builds alert-context remediation suggestions that require human confirmation', () => {
    const suggestions = buildSuggestedRemediationActions(
      {
        source: 'alert',
        signal: 'traces',
        severity: 'critical',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/alert?status=firing&returnLabel=告警'
      },
      t
    );

    expect(suggestions.map(item => item.id)).toEqual([
      'suggest-restart-checkout',
      'suggest-create-silence',
      'suggest-review-runbook'
    ]);
    expect(suggestions[0]).toMatchObject({
      catalogId: 'restart-checkout',
      catalogLabel: '重启 checkout 部署',
      displayMeta: '高风险 · 重启 checkout 部署',
      title: '建议重启 checkout-api',
      source: 'alert-context-handoff',
      risk: 'high',
      confirmation: 'manual-required',
      posture: '只生成建议，人工确认后才能进入执行。'
    });
    expect(suggestions[1]).toMatchObject({
      catalogId: 'mute-edge-alerts',
      catalogLabel: '静默边缘饱和告警',
      displayMeta: '中风险 · 静默边缘饱和告警'
    });
    expect(suggestions.every(item => item.confirmation === 'manual-required')).toBe(true);
    expect(suggestions[0]?.evidence).toContain('来源 告警中心');
    expect(suggestions[0]?.evidence).toContain('信号 链路');
    expect(suggestions[0]?.evidence).not.toContain('来源 alert');
    expect(suggestions[0]?.evidence).not.toContain('信号 traces');

    const evidenceUrl = new URL(suggestions[0]?.evidenceHref || '/', 'http://localhost');
    expect(evidenceUrl.pathname).toBe('/alert');
    expect(evidenceUrl.searchParams.get('status')).toBe('firing');
    expect(evidenceUrl.searchParams.get('entityId')).toBe('service:commerce/checkout');
    expect(evidenceUrl.searchParams.get('serviceName')).toBe('checkout-api');
    expect(evidenceUrl.searchParams.get('traceId')).toBe('trace-123');
    expect(evidenceUrl.searchParams.get('spanId')).toBe('span-456');
    expect(evidenceUrl.searchParams.get('returnTo')).toBe('/alert?status=firing');
    expect(evidenceUrl.searchParams.get('returnLabel')).toBeNull();
  });

  it('localizes unknown evidence source and signal values while preserving the route tokens', () => {
    const suggestions = buildSuggestedRemediationActions(
      {
        source: 'custom-source',
        signal: 'profiling',
        entityName: 'checkout-api'
      },
      t
    );

    expect(suggestions[0]?.evidence).toContain('来源 未知来源 custom-source');
    expect(suggestions[0]?.evidence).toContain('信号 未知信号 profiling');
  });

  it('localizes entity-id-only suggested-action targets while preserving the route token', () => {
    const suggestions = buildSuggestedRemediationActions(
      {
        entityId: 'service:commerce/checkout',
        source: 'entity'
      },
      t
    );

    expect(suggestions[0]?.title).toBe('建议重启 实体 service:commerce/checkout');
    expect(suggestions[1]?.title).toBe('建议为 实体 service:commerce/checkout 创建临时静默');
    expect(suggestions[2]?.title).toBe('建议查看 实体 service:commerce/checkout 处置手册');
    expect(suggestions[0]?.title).not.toBe('建议重启 service:commerce/checkout');

    const evidenceUrl = new URL(suggestions[0]?.evidenceHref || '/', 'http://localhost');
    expect(evidenceUrl.searchParams.get('entityId')).toBe('service:commerce/checkout');
  });

  it('builds a non-executing approval draft request from the first suggested action', () => {
    const draft = buildActionApprovalDraft(
      {
        source: 'alert',
        signal: 'traces',
        entityId: 'service:commerce/checkout',
        serviceName: 'checkout-api',
        traceId: 'trace-123',
        returnTo: '/alert?status=firing&returnLabel=告警'
      },
      t
    );

    expect(draft).toMatchObject({
      state: 'ready',
      adapterOwner: 'next-actions-approval-draft-bff',
      endpoint: '/api/actions/approval-drafts',
      method: 'POST',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      title: '审批草稿适配器'
    });
    expect(draft.request).toMatchObject({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      risk: 'high',
      confirmation: 'manual-required',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      evidenceHref: expect.stringContaining('/alert?')
    });
    expect(draft.request?.context.returnTo).toBe('/alert?status=firing');
    expect(draft.requestPreview).toContain('"actionId":"suggest-restart-checkout"');
    expect(draft.requestPreview).toContain('"executionAllowed":false');
  });

  it('blocks approval draft creation when no evidence context is present', () => {
    const draft = buildActionApprovalDraft({}, t);

    expect(draft.state).toBe('awaiting-context');
    expect(draft.request).toBeUndefined();
    expect(draft.requestPreview).toBe('{}');
    expect(draft.disabledReason).toBe('需要告警、实体或链路上下文后才能生成审批草稿。');
  });

  it('builds a non-executing action catalog read adapter contract', () => {
    const adapter = buildActionCatalogReadAdapter(t);

    expect(adapter).toMatchObject({
      state: 'loading',
      adapterOwner: 'next-actions-catalog-bff',
      endpoint: '/api/actions/catalog?limit=8',
      method: 'GET',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      managerBacked: false,
      title: '动作目录适配器',
      items: []
    });
  });

  it('builds a non-executing approval decision adapter contract', () => {
    const decision = buildActionApprovalDecision(t);

    expect(decision).toMatchObject({
      state: 'awaiting-draft',
      adapterOwner: 'next-actions-approval-decision-bff',
      endpointTemplate: '/api/actions/approval-drafts/:draftId/decision',
      method: 'POST',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      title: '审批决策适配器'
    });
    expect(decision.requestPreview).toContain('"decision":"approved"');
    expect(decision.requestPreview).toContain('"executionAllowed":false');
  });

  it('builds a non-executing approval draft queue read adapter contract', () => {
    const queue = buildActionApprovalDraftQueue(t);

    expect(queue).toMatchObject({
      state: 'loading',
      adapterOwner: 'next-actions-approval-draft-bff',
      endpoint: '/api/actions/approval-drafts?limit=8',
      method: 'GET',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false,
      managerBacked: false,
      title: '审批草稿队列',
      drafts: []
    });
  });

  it('summarizes milestone 8 closure without promoting roadmap-only automation domains', () => {
    const review = buildAutomationActionCatalogReview();

    expect(review.milestone).toBe(8);
    expect(review.status).toBe('ready-for-platform-governance');
    expect(review.implementedCapabilities).toEqual([
      'alert-evidence-automation-handoff',
      'contextual-suggested-actions',
      'manual-required-confirmation',
      'suggestion-evidence-links',
      'adapter-boundary-panel',
      'roadmap-demo-snapshot-guard',
      'no-auto-execute-endpoint'
    ]);
    expect(review.liveHandoffs).toEqual(['alert-context-suggestions']);
    expect(review.confirmationModes).toEqual(['manual-required']);
    expect(review.snapshotStates).toEqual(['roadmap-demo']);
    expect(review.executionBoundary).toBe('adapter-pending');
    expect(review.futureRoadmapOnly).toEqual([
      'workflow-automation',
      'action-catalog',
      'app-builder',
      'self-service-actions',
      'approvals',
      'scripts',
      'runbook-orchestration'
    ]);
    expect(review.nextMilestone).toBe('platform-governance-extension-future-domains');
  });
});
