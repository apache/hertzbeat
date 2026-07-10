import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildActionsPlaceholderState, buildActionsSurfaceViewModel } from './view-model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('actions surface view model', () => {
  it('describes the OTLP cold-matte placeholder shell', () => {
    const state = buildActionsPlaceholderState(t);

    expect(state).toMatchObject({
      kicker: t('actions.entry.kicker'),
      title: t('actions.entry.title'),
      subtitle: t('actions.entry.subtitle'),
      adapterBoundary: {
        state: 'adapter-pending',
        label: t('actions.adapter-boundary.label'),
        roadmapOnlyLabels: [
          t('actions.adapter-boundary.roadmap.workflow-automation'),
          t('actions.adapter-boundary.roadmap.action-catalog'),
          t('actions.adapter-boundary.roadmap.app-builder'),
          t('actions.adapter-boundary.roadmap.self-service-actions'),
          t('actions.adapter-boundary.roadmap.approvals'),
          t('actions.adapter-boundary.roadmap.scripts'),
          t('actions.adapter-boundary.roadmap.runbook-orchestration')
        ]
      },
      approvalDraft: {
        state: 'awaiting-context',
        adapterOwner: 'next-actions-approval-draft-bff',
        endpoint: '/api/actions/approval-drafts',
        executionAllowed: false
      },
      approvalDecision: {
        state: 'awaiting-draft',
        adapterOwner: 'next-actions-approval-decision-bff',
        endpointTemplate: '/api/actions/approval-drafts/:draftId/decision',
        executionAllowed: false
      },
      approvalDraftQueue: {
        state: 'loading',
        adapterOwner: 'next-actions-approval-draft-bff',
        endpoint: '/api/actions/approval-drafts?limit=8',
        executionAllowed: false,
        managerBacked: false
      },
      catalogAdapter: {
        state: 'loading',
        adapterOwner: 'next-actions-catalog-bff',
        endpoint: '/api/actions/catalog?limit=8',
        executionAllowed: false,
        managerBacked: false
      },
      shell: {
        eyebrow: t('actions.entry.shell.eyebrow'),
        chips: [
          t('actions.entry.chip.catalog'),
          t('actions.entry.chip.risk'),
          t('actions.entry.chip.approval')
        ]
      },
      empty: {
        title: t('actions.entry.empty.title')
      }
    });
    expect(state.actions).toEqual([
      { label: t('actions.entry.action.overview'), href: '/overview', variant: 'primary' },
      { label: t('actions.entry.action.entities'), href: '/entities', variant: 'subtle' }
    ]);
    expect(state.checklist.map(item => item.title)).toEqual([
      t('actions.entry.checklist.context.title'),
      t('actions.entry.checklist.adapter.title'),
      t('actions.entry.checklist.evidence.title')
    ]);
  });

  it('keeps static action snapshots behind an explicit adapter boundary', () => {
    const viewModel = buildActionsSurfaceViewModel(t);

    expect(viewModel.adapterBoundary.copy).toBe(t('actions.adapter-boundary.copy'));
    expect(viewModel.catalogCards.every(card => card.snapshotState === 'roadmap-demo')).toBe(true);
    expect(viewModel.runRows.every(row => row.snapshotState === 'roadmap-demo')).toBe(true);
    expect(viewModel.approvalRows.every(row => row.snapshotState === 'roadmap-demo')).toBe(true);
    expect(viewModel.catalogCards[0]?.meta).toContain(t('actions.snapshot.label'));
    expect(viewModel.runRows[0]?.meta).toContain(t('actions.snapshot.label'));
    expect(viewModel.approvalRows[0]?.meta).toContain(t('actions.snapshot.label'));
  });

  it('derives catalog, run, and approval sections from the domain snapshot', () => {
    const viewModel = buildActionsSurfaceViewModel(t);

    expect(viewModel.kicker).toBe(t('actions.surface.kicker'));
    expect(viewModel.subtitle).toBe(t('actions.subtitle'));
    expect(viewModel.tags).toEqual([
      t('actions.tag.catalog'),
      t('actions.tag.risk-aware'),
      t('actions.tag.approval-flow')
    ]);
    expect(viewModel.facts.find(fact => fact.label === t('ops.surface.fact.signals-label'))?.value).toBe('3');
    expect(viewModel.catalogCards).toHaveLength(3);
    expect(viewModel.catalogCards[0]).toMatchObject({
      title: t('actions.catalog.restart.name'),
      eyebrow: t('actions.catalog.restart.category'),
      copy: `${t('actions.catalog.restart.scope')} · ${t('actions.catalog.restart.owner')}`,
      posture: t('actions.catalog.restart.posture')
    });
    expect(viewModel.catalogCards[0]?.meta).toContain(t('actions.catalog.restart.last-run'));
    expect(viewModel.runRows[0]).toMatchObject({
      title: t('actions.run.restart.name'),
      copy: `${t('actions.run.restart.target')} · ${t('actions.run.restart.actor')} · ${t('actions.run.restart.duration')}`
    });
    expect(viewModel.runRows[0]?.meta).toContain(t('actions.run-status.awaiting-approval'));
    expect(viewModel.approvalRows[0]?.meta).toContain(t('actions.approval-status.pending'));
    expect(viewModel.approvalRows[0]).toMatchObject({
      title: t('actions.approval.restart.summary'),
      copy: `${t('actions.approval.restart.owner')} · ${t('actions.approval.restart.evidence')}`
    });
    expect(viewModel.checklist[0]).toMatchObject({
      title: t('actions.checklist.entry.title'),
      copy: t('actions.checklist.entry.copy'),
      meta: t('actions.checklist.entry.meta')
    });
    expect(viewModel.checklist[1]).toMatchObject({
      title: t('actions.checklist.adapters.title'),
      copy: t('actions.checklist.adapters.copy'),
      meta: t('actions.checklist.adapters.meta')
    });
    expect(viewModel.handoffRows[0]).toMatchObject({
      title: t('actions.surface.handoff.entity.title'),
      copy: t('actions.surface.handoff.entity.copy'),
      meta: 'entities'
    });
    expect(viewModel.handoffRows[1]).toMatchObject({
      title: t('actions.surface.handoff.monitor.title'),
      copy: t('actions.surface.handoff.monitor.copy'),
      meta: 'monitors'
    });
    expect(viewModel.nextHops.map(item => item.label)).toEqual([
      t('menu.dashboard.back'),
      t('menu.entity.center'),
      t('menu.monitor.center')
    ]);
    expect(viewModel.nextHops.map(item => item.href)).toEqual(['/overview', '/entities', '/monitors']);
  });

  it('keeps alert-context suggested actions in a human-confirmed posture', () => {
    const state = buildActionsPlaceholderState(t, {
      source: 'alert',
      signal: 'traces',
      severity: 'critical',
      entityId: 'service:commerce/checkout',
      serviceName: 'checkout-api',
      environment: 'prod',
      timeRange: 'last-1h',
      traceId: 'trace-123',
      spanId: 'span-456'
    });

    expect(state.suggestedActions).toHaveLength(3);
    expect(state.suggestedActions[0]).toMatchObject({
      id: 'suggest-restart-checkout',
      title: t('actions.suggestion.restart.title', { target: 'checkout-api' }),
      catalogLabel: t('actions.catalog.restart.name'),
      displayMeta: `${t('actions.risk.high')} · ${t('actions.catalog.restart.name')}`,
      source: 'alert-context-handoff',
      confirmation: 'manual-required'
    });
    expect(state.approvalDraft).toMatchObject({
      state: 'ready',
      endpoint: '/api/actions/approval-drafts',
      executionMode: 'manual-approval-draft-only',
      executionAllowed: false
    });
    expect(state.approvalDraft.request).toMatchObject({
      actionId: 'suggest-restart-checkout',
      catalogId: 'restart-checkout',
      executionAllowed: false
    });
    expect(state.suggestedActions.every(action => action.posture === t('actions.suggestion.manual-required'))).toBe(true);
    expect(state.suggestedActions[0]?.evidence).toContain(
      t('actions.suggestion.evidence.source', { value: t('actions.suggestion.source.alert') })
    );
    expect(state.suggestedActions[0]?.evidence).toContain(
      t('actions.suggestion.evidence.signal', { value: t('actions.suggestion.signal.traces') })
    );
    expect(state.suggestedActions[0]?.evidence).not.toContain(
      t('actions.suggestion.evidence.source', { value: 'alert' })
    );
    expect(state.suggestedActions[0]?.evidence).not.toContain(
      t('actions.suggestion.evidence.signal', { value: 'traces' })
    );
  });

  it('keeps route tracking source params from enabling suggested actions', () => {
    const state = buildActionsPlaceholderState(t, {
      source: 'product-design-1590-default'
    });

    expect(state.suggestedActions).toEqual([]);
    expect(state.approvalDraft).toMatchObject({
      state: 'awaiting-context',
      executionAllowed: false,
      request: undefined
    });
  });

  it('keeps entity-id-only suggested action targets localized without changing handoff data', () => {
    const state = buildActionsPlaceholderState(t, {
      entityId: 'service:commerce/checkout',
      source: 'entity'
    });

    const target = t('actions.suggestion.target.entity-id', { entityId: 'service:commerce/checkout' });
    expect(state.suggestedActions[0]?.title).toBe(t('actions.suggestion.restart.title', { target }));
    expect(state.suggestedActions[0]?.title).not.toBe(
      t('actions.suggestion.restart.title', { target: 'service:commerce/checkout' })
    );

    const evidenceUrl = new URL(state.suggestedActions[0]?.evidenceHref || '/', 'http://localhost');
    expect(evidenceUrl.searchParams.get('entityId')).toBe('service:commerce/checkout');
  });
});
