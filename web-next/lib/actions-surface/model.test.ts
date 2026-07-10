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
const alertReturnTo = `/alert?status=firing&returnLabel=${encodeURIComponent(t('actions.suggestion.source.alert'))}`;

describe('actions domain model', () => {
  it('builds a domain-specific automation workspace snapshot', () => {
    const model = buildActionsDomainModel(t);

    expect(model.title).toBe(t('actions.entry.title'));
    expect(model.tags).toEqual([
      t('actions.tag.catalog'),
      t('actions.tag.risk-aware'),
      t('actions.tag.approval-flow')
    ]);
    expect(model.catalog).toHaveLength(3);
    expect(model.catalog[0]).toMatchObject({
      name: t('actions.catalog.restart.name'),
      category: t('actions.catalog.restart.category'),
      scope: t('actions.catalog.restart.scope'),
      owner: t('actions.catalog.restart.owner'),
      lastRun: t('actions.catalog.restart.last-run'),
      posture: t('actions.catalog.restart.posture')
    });
    expect(model.runs[0]?.status).toBe('awaiting-approval');
    expect(model.runs[0]).toMatchObject({
      name: t('actions.run.restart.name'),
      target: 'checkout / prod-ap',
      actor: 'li.na',
      duration: t('actions.run.restart.duration')
    });
    expect(model.approvals[0]?.status).toBe('pending');
    expect(model.approvals[0]).toMatchObject({
      summary: t('actions.approval.restart.summary'),
      owner: 'checkout-oncall',
      evidence: t('actions.approval.restart.evidence')
    });
    expect(model.metrics).toEqual([
      { label: t('actions.metric.catalog-entries'), value: '3' },
      { label: t('actions.metric.pending-approvals'), value: '1' },
      { label: t('actions.metric.recent-runs'), value: '3' },
      { label: t('actions.metric.high-risk-actions'), value: '1' }
    ]);
    expect(model.checklist.map(item => item.meta)).toEqual([
      t('actions.checklist.entry.meta'),
      t('actions.checklist.adapters.meta'),
      t('actions.checklist.context.meta')
    ]);
    expect(model.nextHops.map(item => item.label)).toEqual([
      t('menu.dashboard.back'),
      t('menu.entity.center'),
      t('menu.monitor.center')
    ]);
    expect(model.nextHops.map(item => item.href)).toEqual(['/overview', '/entities', '/monitors']);
  });

  it('marks catalog, run, and approval snapshots as roadmap demo data until adapters land', () => {
    const model = buildActionsDomainModel(t);

    expect(model.adapterBoundary).toMatchObject({
      state: 'adapter-pending',
      label: t('actions.adapter-boundary.label'),
      liveHandoff: 'alert-context-suggestions'
    });
    expect(model.adapterBoundary.copy).toBe(t('actions.adapter-boundary.copy'));
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
      t('actions.adapter-boundary.roadmap.workflow-automation'),
      t('actions.adapter-boundary.roadmap.action-catalog'),
      t('actions.adapter-boundary.roadmap.app-builder'),
      t('actions.adapter-boundary.roadmap.self-service-actions'),
      t('actions.adapter-boundary.roadmap.approvals'),
      t('actions.adapter-boundary.roadmap.scripts'),
      t('actions.adapter-boundary.roadmap.runbook-orchestration')
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
        returnTo: alertReturnTo
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
      catalogLabel: t('actions.catalog.restart.name'),
      displayMeta: `${t('actions.risk.high')} · ${t('actions.catalog.restart.name')}`,
      title: t('actions.suggestion.restart.title', { target: 'checkout-api' }),
      source: 'alert-context-handoff',
      risk: 'high',
      confirmation: 'manual-required',
      posture: t('actions.suggestion.manual-required')
    });
    expect(suggestions[1]).toMatchObject({
      catalogId: 'mute-edge-alerts',
      catalogLabel: t('actions.catalog.mute.name'),
      displayMeta: `${t('actions.risk.medium')} · ${t('actions.catalog.mute.name')}`
    });
    expect(suggestions.every(item => item.confirmation === 'manual-required')).toBe(true);
    expect(suggestions[0]?.evidence).toContain(
      t('actions.suggestion.evidence.source', { value: t('actions.suggestion.source.alert') })
    );
    expect(suggestions[0]?.evidence).toContain(
      t('actions.suggestion.evidence.signal', { value: t('actions.suggestion.signal.traces') })
    );
    expect(suggestions[0]?.evidence).not.toContain(
      t('actions.suggestion.evidence.source', { value: 'alert' })
    );
    expect(suggestions[0]?.evidence).not.toContain(
      t('actions.suggestion.evidence.signal', { value: 'traces' })
    );

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

    expect(suggestions[0]?.evidence).toContain(
      t('actions.suggestion.evidence.source', {
        value: t('actions.suggestion.source.unknown', { source: 'custom-source' })
      })
    );
    expect(suggestions[0]?.evidence).toContain(
      t('actions.suggestion.evidence.signal', {
        value: t('actions.suggestion.signal.unknown', { signal: 'profiling' })
      })
    );
  });

  it('localizes entity-id-only suggested-action targets while preserving the route token', () => {
    const suggestions = buildSuggestedRemediationActions(
      {
        entityId: 'service:commerce/checkout',
        source: 'entity'
      },
      t
    );

    const target = t('actions.suggestion.target.entity-id', { entityId: 'service:commerce/checkout' });
    expect(suggestions[0]?.title).toBe(t('actions.suggestion.restart.title', { target }));
    expect(suggestions[1]?.title).toBe(t('actions.suggestion.silence.title', { target }));
    expect(suggestions[2]?.title).toBe(t('actions.suggestion.runbook.title', { target }));
    expect(suggestions[0]?.title).not.toBe(t('actions.suggestion.restart.title', { target: 'service:commerce/checkout' }));

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
        returnTo: alertReturnTo
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
      title: t('actions.approval-draft.title')
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
    expect(draft.disabledReason).toBe(t('actions.approval-draft.disabled'));
  });

  it('does not treat source-only tracking params as actionable evidence context', () => {
    const suggestions = buildSuggestedRemediationActions({ source: 'product-design-1590-default' }, t);
    const draft = buildActionApprovalDraft({ source: 'product-design-1590-default' }, t);

    expect(suggestions).toEqual([]);
    expect(draft.state).toBe('awaiting-context');
    expect(draft.request).toBeUndefined();
    expect(draft.requestPreview).toBe('{}');
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
      title: t('actions.catalog-adapter.title'),
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
      title: t('actions.approval-decision.title')
    });
    expect(decision.requestPreview).toContain('"decision":"manual-choice-required"');
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
      title: t('actions.approval-draft-queue.title'),
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
