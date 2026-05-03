import { describe, expect, it } from 'vitest';
import { buildActionsDomainModel, buildAutomationActionCatalogReview, buildSuggestedRemediationActions } from './model';

const t = (key: string) => {
  const messages: Record<string, string> = {
    'actions.subtitle': 'Automation catalog, execution history, and approval-aware operations all stay in one context.',
    'actions.focus': 'Automation inventory and execution guardrails',
    'actions.summary': 'The actions entry page carries automation catalog, execution history, and approval semantics without requiring a page redesign for future data.',
    'actions.checklist.entry.title': 'Entry shell ready',
    'actions.checklist.entry.copy': 'The action catalog already uses the shared workbench language.',
    'actions.checklist.adapters.title': 'Execution adapters',
    'actions.checklist.adapters.copy': 'Action list, run result, and approval flow keep the current integration boundary.',
    'actions.checklist.context.title': 'Context continuity',
    'actions.checklist.context.copy': 'Jump to the actions page directly from entity, alert, or topology context.',
    'menu.dashboard.back': 'Open overview',
    'menu.entity.center': 'Entity center',
    'menu.monitor.center': 'Monitor center'
  };
  return messages[key] ?? key;
};

describe('actions domain model', () => {
  it('builds a domain-specific automation workspace snapshot', () => {
    const model = buildActionsDomainModel(t);

    expect(model.title).toBe('Actions');
    expect(model.catalog).toHaveLength(3);
    expect(model.runs[0]?.status).toBe('awaiting-approval');
    expect(model.approvals[0]?.status).toBe('pending');
    expect(model.metrics).toEqual([
      { label: 'Catalog entries', value: '3' },
      { label: 'Pending approvals', value: '1' },
      { label: 'Recent runs', value: '3' },
      { label: 'High-risk actions', value: '1' }
    ]);
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
    expect(model.catalog.every(item => item.snapshotState === 'roadmap-demo')).toBe(true);
    expect(model.runs.every(item => item.snapshotState === 'roadmap-demo')).toBe(true);
    expect(model.approvals.every(item => item.snapshotState === 'roadmap-demo')).toBe(true);
    expect(model.suggestedActions).toEqual([]);
  });

  it('builds alert-context remediation suggestions that require human confirmation', () => {
    const suggestions = buildSuggestedRemediationActions({
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
    });

    expect(suggestions.map(item => item.id)).toEqual([
      'suggest-restart-checkout',
      'suggest-create-silence',
      'suggest-review-runbook'
    ]);
    expect(suggestions[0]).toMatchObject({
      catalogId: 'restart-checkout',
      title: '建议重启 checkout-api',
      source: 'alert-context-handoff',
      risk: 'high',
      confirmation: 'manual-required',
      posture: '只生成建议，人工确认后才能进入执行。'
    });
    expect(suggestions.every(item => item.confirmation === 'manual-required')).toBe(true);

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
