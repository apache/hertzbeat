// @vitest-environment jsdom

import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interpolate, LOCALES, type LocaleCode, type TranslationParams } from '../../lib/i18n';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { EntityDetailSurface } from './entity-detail-surface';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const i18nMock = vi.hoisted(() => ({
  locale: 'en-US' as LocaleCode
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    locale: i18nMock.locale,
    locales: LOCALES,
    ready: true,
    t: (key: string, params?: TranslationParams) => {
      const template = SUPPLEMENTAL_MESSAGES[i18nMock.locale]?.[key] ?? key;
      return interpolate(template, params);
    },
    setLocale: async (locale: string) => {
      i18nMock.locale = locale as LocaleCode;
    }
  })
}));

const detail = {
  entity: {
    entity: {
      id: 42,
      name: 'checkout-api',
      displayName: 'Checkout API',
      type: 'service',
      status: 'healthy',
      owner: 'platform',
      environment: 'prod',
      system: 'payments',
      runbook: 'https://runbooks.local/checkout',
      description: 'Checkout service'
    },
    identities: [{ id: 'host' }],
    monitorBinds: [{ id: 1 }],
    relations: [{ relationType: 'calls', targetEntityId: 'mysql-1', targetEntityName: 'mysql-prod' }]
  },
  evidenceSummary: {
    collectorOfflineCount: 1,
    collectorOnlineCount: 1,
    collectorTaskCount: 11,
    collectorTotalCount: 2,
    collectorLastSeenAt: '2026-04-10 18:05:00',
    downMonitorCount: 1,
    identityCount: 1
  },
  monitorSummary: {
    totalBoundMonitors: 2
  },
  logSummary: {
    hintCount: 3,
    preferredQueryTitle: 'checkout errors'
  },
  traceSummary: {
    recentTraceCount: 4,
    recentErrorTraceCount: 1
  },
  unifiedEvidenceSummary: {
    activeSignalCount: 3,
    metricsActive: true,
    logsActive: true,
    tracesActive: true,
    metricEvidenceCount: 2,
    logEvidenceCount: 3,
    traceEvidenceCount: 4,
    latestObservedAt: '2026-05-13 14:55:00',
    activeSignals: ['metrics', 'logs', 'traces']
  },
  activeAlerts: [{ id: 1 }],
  alertSummary: {
    totalActiveAlerts: 1
  },
  nextActions: [
    {
      title: 'Open monitors',
      summary: 'Inspect the abnormal monitors first.',
      actionLabel: 'Open monitors'
    }
  ]
} as any;

function message(locale: LocaleCode, key: string, params?: TranslationParams) {
  const template = SUPPLEMENTAL_MESSAGES[locale]?.[key] ?? key;
  return interpolate(template, params);
}

describe('EntityDetailSurface', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    i18nMock.locale = 'en-US';
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  it('keeps entity detail on the cold full-width Workbench owner without side panels', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/entity-detail-surface.tsx'), 'utf8');

    expect(source).toContain('data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"');
    expect(source).toContain('data-entity-detail-style-baseline={coldEntityDetailVisual.canvasName}');
    expect(source).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(source).toContain('data-entity-detail-header="hertzbeat-ui-compact-header"');
    expect(source).toContain('data-entity-detail-header-nesting-contract="flat-page-introduction"');
    expect(source).toContain('data-entity-detail-command-row="standard-equal-buttons"');
    expect(source).toContain('data-entity-detail-command-action="return"');
    expect(source).toContain('data-entity-detail-command-action="refresh"');
    expect(source).toContain('data-entity-detail-command-action="edit-definition"');
    expect(source).toContain('data-entity-detail-command-action="edit"');
    expect(source).toContain('data-entity-detail-command-action="delete"');
    expect(source).toContain('data-entity-detail-evidence-chain="diagnosis-first"');
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('data-entity-detail-workspace-tablist-responsive="wrap-mobile-no-local-scroll"');
    expect(source).toContain('grid w-full max-w-full grid-cols-2');
    expect(source).toContain('sm:inline-flex sm:w-auto sm:overflow-x-visible');
    expect(source).toContain('aria-selected={selected}');
    expect(source).toContain('aria-controls={panelId}');
    expect(source).toContain('handleWorkspaceTabKeyDown');
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'ArrowLeft'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain('onKeyDown={event => handleWorkspaceTabKeyDown(event, tab.key)}');
    expect(source).toContain('tabIndex={selected ? 0 : -1}');
    expect(source).toContain('data-entity-detail-evidence-chain-selected={selected ?');
    expect(source).toContain('data-entity-detail-evidence-chain-step={step.key}');
    expect(source).toContain('data-entity-detail-evidence-chain-priority={step.priority ?');
    expect(source).toContain('data-entity-detail-evidence-chain-diagnosis={selectedStep.key}');
    expect(source).toContain('data-entity-detail-evidence-chain-action={selectedStep.key}');
    expect(source).toContain('buildEntityEvidenceChainSteps');
    expect(source).toContain('handleStepKeyDown');
    expect(source).not.toContain('aria-pressed={selected}');
    expect(source).toContain('data-entity-detail-action-help={id}');
    expect(source).toContain('data-entity-detail-action-help-style="icon-after-action"');
    expect(source).toContain('data-entity-detail-action-help-trigger="hertzbeat-ui-action-help"');
    expect(source).toContain('data-entity-detail-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-entity-detail-action-help-icon="lucide-circle-help"');
    expect(source).toContain('data-entity-detail-action-help-tooltip={id}');
    expect(source).toContain('data-entity-detail-command-row-help-contract="single-header-help"');
    expect(source).not.toContain('data-entity-detail-action-help-item={helpId}');
    expect(source).toContain('data-entity-detail-count-strip="hertzbeat-ui-inline-counts"');
    expect(source).toContain('data-entity-detail-count-metric={key}');
    expect(source).toContain('resolveRelationEvidenceCount');
    expect(source).toContain('data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"');
    expect(source).toContain('data-entity-detail-overview-panel="hertzbeat-ui-overview-panel"');
    expect(source).toContain('data-entity-detail-related-panel="hertzbeat-ui-related-panel"');
    expect(source).toContain('data-entity-detail-next-panel="hertzbeat-ui-next-panel"');
    expect(source).toContain('data-entity-detail-drilldown-panel="hertzbeat-ui-drilldown-panel"');
    expect(source).toContain('data-entity-detail-context-center="hertzbeat-entity-context"');
    expect(source).toContain('data-entity-detail-current-alerts="current-alerts"');
    expect(source).toContain('data-entity-detail-relationships-panel="upstream-downstream"');
    expect(source).toContain('data-entity-detail-collection-source-panel="source-template-binding"');
    expect(source).toContain('data-entity-detail-attribution-panel="entity-resource-attribution"');
    expect(source).toContain('data-entity-detail-attribution-row={row.key}');
    expect(source).toContain('data-entity-detail-attribution-state={row.state}');
    expect(source).toContain('data-entity-detail-template-binding="monitor-template-binding"');
    expect(source).toContain('data-entity-health-model="lightweight-service-health"');
    expect(source).toContain('data-entity-health-slo-mode="lightweight-no-slo-authoring"');
    expect(source).toContain('data-entity-detail-evidence-model="red-use-read-model"');
    expect(source).toContain('buildUnifiedEvidenceRows');
    expect(source).toContain('data-entity-detail-evidence-handoff="alert-topology-runbook"');
    expect(source).toContain('data-entity-detail-evidence-handoff-row={row.key}');
    expect(source).toContain('data-entity-detail-evidence-handoff-source={row.evidence}');
    expect(source).toContain('data-entity-detail-evidence-handoff-count={row.count}');
    expect(source).toContain('buildEntityEvidenceHandoffRows');
    expect(source).toContain('data-entity-health-collector-handoff="collector-cluster"');
    expect(source).toContain('data-entity-health-collector-freshness="last-seen"');
    expect(source).toContain('buildEntityHealthModel');
    expect(source).toContain('buildEntityAttributionRows');
    expect(source).toContain('data-entity-detail-context-link={link.key}');
    expect(source).toContain('data-entity-detail-inherited-context="route-context"');
    expect(source).toContain('data-entity-detail-inherited-context-row={row.label}');
    expect(source).toContain("data-entity-detail-created-feedback={createdResult ? 'post-create-next-step' : undefined}");
    expect(source).toContain("data-entity-detail-updated-feedback={updatedResult ? 'post-edit-readback' : undefined}");
    expect(source).toContain('data-entity-detail-created-feedback-state="saved-and-readable"');
    expect(source).toContain('data-entity-detail-created-guide="novice-next-steps"');
    expect(source).toContain('data-entity-detail-created-guide-step={step.key}');
    expect(source).toContain('data-entity-detail-created-guide-action={step.key}');
    expect(source).toContain('data-entity-detail-created-guide-copy={step.key}');
    expect(source).toContain('data-entity-detail-created-guide-target={step.href}');
    expect(source).toContain('min-h-[112px]');
    expect(source).toContain('data-entity-detail-missing-recovery={missingDetail ?');
    expect(source).toContain('data-entity-detail-missing-recovery-actions="return-refresh-only"');
    expect(source).toContain("from '../workbench/overlay-dialog'");
    expect(source).toContain('data-entity-detail-delete-confirm-trigger="hertzbeat-ui-modal"');
    expect(source).toContain('data-entity-detail-delete-confirm="hertzbeat-ui-modal"');
    expect(source).toContain("closeLabel={t('common.dialog.close')}");
    expect(source).toContain("title={t('entities.detail.delete.title')}");
    expect(source).toContain("kicker={t('entities.detail.delete.kicker')}");
    expect(source).toContain("t('entities.detail.delete.cancel')");
    expect(source).toContain("t('entities.detail.delete.confirm')");
    expect(source).toContain("t('entities.detail.delete.copy')");
    expect(source).toContain('buildDeleteImpactRows');
    expect(source).toContain('data-entity-detail-delete-impact-summary="read-model-counts"');
    expect(source).toContain('data-entity-detail-delete-impact-row={row.label}');
    expect(source).toContain('data-entity-detail-delete-impact-warning="has-related-evidence"');
    expect(source).toContain("t('entities.detail.delete.impact-warning')");
    expect(source).toContain("t('entities.detail.attribution.ready')");
    expect(source).toContain("t('entities.detail.attribution.review')");
    expect(source).toContain("t('entities.detail.attribution.missing')");
    expect(source).toContain("const { t } = useI18n()");
    expect(source).not.toContain('rounded-full text-[11px] font-semibold leading-none text-[#8d95a5]');
    expect(source).not.toMatch(/title="\u786e\u8ba4\u5220\u9664\u5b9e\u4f53"/);
    expect(source).not.toMatch(/kicker="\u5bf9\u8c61\u76ee\u5f55"/);
    expect(source).not.toMatch(/\u5220\u9664\u540e\u5b9e\u4f53\u4f1a\u4ece\u5bf9\u8c61\u76ee\u5f55\u79fb\u9664/);
    expect(source).not.toMatch(/\u5df2\u5f52\u56e0/);
    expect(source).not.toMatch(/\u5f85\u786e\u8ba4/);
    expect(source).not.toMatch(/\u7f3a\u5931/);
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain('HelpCircle');
    expect(source).toContain('CircleHelp');
    expect(source).not.toContain('data-entity-detail-action-help-style="literal-question-after-action"');
    expect(source).not.toContain('data-entity-detail-action-help-visual="borderless-question"');
    expect(source).not.toContain('>?</button>');
    expect(source).toContain('buildEntityContextHandoffLinks');
    expect(source).toContain('data-entity-detail-error="hertzbeat-ui-inline-error"');
    expect(source).toContain('data-entity-detail-direction2-workbench="evidence-workspace-context-rail"');
    expect(source).toContain('data-entity-detail-evidence-workspace="single"');
    expect(source).toContain('data-entity-detail-context-rail="identity-route-shortcuts"');
    expect(source).toContain('xl:grid-cols-[minmax(0,1fr)_320px]');
    expect(source).not.toContain('lg:grid-cols-2');
    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).not.toContain('data-entity-detail-header="hertzbeat-ui-compact-header" className={coldEntityDetailVisual.panel.hero}');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_360px]');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('ObservabilityStatusState');
    expect(source).not.toContain('components/workbench/primitives');
    expect(source).not.toContain('hover' + ':text-white');
    expect(source).not.toContain('text-white' + '/55');
  });

  it('renders a compact post-create success and next-step notice only when the route says this entity was just created', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{ returnTo: '/entities?source=entity-create-return' }}
        createdResult
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-created-feedback="post-create-next-step"');
    expect(html).toContain('data-entity-detail-created-feedback-state="saved-and-readable"');
    expect(html).toContain('data-entity-detail-created-guide="novice-next-steps"');
    expect(html).toContain('data-entity-detail-created-guide-step="identity"');
    expect(html).toContain('data-entity-detail-created-guide-step="live"');
    expect(html).toContain('data-entity-detail-created-guide-step="next"');
    expect(html).toContain('data-entity-detail-created-guide-copy="identity"');
    expect(html).toContain('data-entity-detail-created-guide-copy="live"');
    expect(html).toContain('data-entity-detail-created-guide-copy="next"');
    expect(html).toContain('data-entity-detail-created-guide-evidence="identity"');
    expect(html).toContain(message('en-US', 'entities.detail.created.title'));
    expect(html).toContain(message('en-US', 'entities.detail.created.copy'));
    expect(html).toContain('href="/entities?source=entity-create-return"');
    expect(html).not.toContain('data-entity-detail-route-created');
  });

  it('shows the created entity primary identity in the post-create guide without expanding every identity row', () => {
    const createdDetail = {
      ...detail,
      entity: {
        ...detail.entity,
        identities: [
          { identityKey: 'service.name', identityValue: 'codex-pd-checkout-api' },
          { identityKey: 'service.namespace', identityValue: 'product-design' },
          { identityKey: 'deployment.environment.name', identityValue: 'prod' }
        ]
      }
    } as any;

    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={createdDetail}
        routeContext={{ source: 'product-design-created-readback' }}
        createdResult
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-created-guide-evidence="identity"');
    expect(html).toContain('service.name=codex-pd-checkout-api, service.namespace=product-design');
    expect(html).toContain(message('en-US', 'entities.detail.collection.identity.more', { count: 1 }));
    expect(html).not.toContain('deployment.environment.name=prod');
  });

  it('gives a newly created entity without live evidence a concrete novice next-step path', () => {
    const newEntityWithoutEvidence = {
      ...detail,
      entity: {
        ...detail.entity,
        identities: [],
        monitorBinds: [],
        relations: [],
        entity: {
          ...detail.entity.entity,
          owner: null,
          status: 'unknown'
        }
      },
      activeAlerts: [],
      alertSummary: {
        totalActiveAlerts: 0
      },
      boundMonitors: [],
      evidenceSummary: {
        collectorOfflineCount: 0,
        collectorOnlineCount: 0,
        collectorTaskCount: 0,
        collectorTotalCount: 0,
        downMonitorCount: 0,
        identityCount: 0
      },
      logSummary: {
        hintCount: 0,
        preferredQueryTitle: null
      },
      monitorSummary: {
        totalBoundMonitors: 0
      },
      nextActions: [],
      traceSummary: {
        recentTraceCount: 0,
        recentErrorTraceCount: 0
      },
      unifiedEvidenceSummary: {
        activeSignalCount: 0,
        metricsActive: false,
        logsActive: false,
        tracesActive: false,
        metricEvidenceCount: 0,
        logEvidenceCount: 0,
        traceEvidenceCount: 0,
        activeSignals: []
      }
    } as any;

    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={newEntityWithoutEvidence}
        routeContext={{ source: 'product-design-created-novice' }}
        createdResult
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-created-guide="novice-next-steps"');
    expect(html).toContain('data-entity-detail-created-guide-action="identity"');
    expect(html).toContain('data-entity-detail-created-guide-action="live"');
    expect(html).toContain('data-entity-detail-created-guide-action="next"');
    expect(html).toContain('data-entity-detail-command-action="created-guide-identity"');
    expect(html).toContain('data-entity-detail-command-action="created-guide-live"');
    expect(html).toContain('data-entity-detail-command-action="created-guide-next"');
    expect(html).toContain('data-entity-detail-created-guide-target="/entities/42/definition?source=product-design-created-novice"');
    expect(html).toContain('data-entity-detail-created-guide-target="/entities/42/edit?source=product-design-created-novice&amp;stage=signals"');
    expect(html).toContain('Identity');
    expect(html).toContain('Live evidence');
    expect(html).toContain('Next step');
    expect(html).toContain(message('en-US', 'entities.detail.chain.identity.ready-copy'));
    expect(html).toContain(message('en-US', 'entities.detail.chain.live.missing-copy'));
    expect(html).toContain(message('en-US', 'entities.detail.chain.next.waiting-copy'));
    expect(html).toContain('Bind monitor');
    expect(html).toContain('href="/entities/42/edit?source=product-design-created-novice&amp;stage=signals"');
    expect(html).not.toContain('Ready to investigate');
  });

  it('does not show post-create success on ordinary detail loads', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface detail={detail} actionError={null} isPending={false} onDelete={() => undefined} onRefresh={() => undefined} />
    );

    expect(html).not.toContain('data-entity-detail-created-feedback="post-create-next-step"');
  });

  it('renders post-edit readback actions when the route says this entity was just updated', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{ returnTo: '/entities?source=entity-edit-return' }}
        updatedResult
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-updated-feedback="post-edit-readback"');
    expect(html).toContain('data-entity-detail-created-feedback-state="saved-and-readable"');
    expect(html).toContain(message('en-US', 'entities.detail.updated.title'));
    expect(html).toContain(message('en-US', 'entities.detail.updated.copy'));
    expect(html).toContain('data-entity-detail-updated-actions="post-edit-readback"');
    expect(html).toContain('data-entity-detail-updated-action="return"');
    expect(html).toContain('data-entity-detail-updated-action-target="/entities?source=entity-edit-return"');
    expect(html).toContain('data-entity-detail-updated-action="definition"');
    expect(html).toContain('data-entity-detail-updated-action-target="/entities/42/definition?returnTo=%2Fentities%3Fsource%3Dentity-edit-return"');
    expect(html).toContain('data-entity-detail-updated-action="refresh"');
    expect(html).toContain(message('en-US', 'entities.detail.action.edit-definition'));
    expect(html).toContain(message('en-US', 'common.refresh'));
    expect(html).not.toContain('data-entity-detail-created-feedback="post-create-next-step"');
    expect(html).not.toContain('data-entity-detail-created-guide="novice-next-steps"');
  });

  it('turns backend next action guidance into safe clickable HertzBeat routes', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={{
          ...detail,
          nextActions: [
            {
              title: 'Review alerts',
              summary: 'Active alert',
              actionLabel: 'Open alerts',
              actionType: 'review_alerts'
            },
            {
              title: 'External docs',
              summary: 'Unsafe external action',
              actionLabel: 'Open docs',
              actionType: 'external',
              url: 'https://example.invalid/phish'
            }
          ]
        } as any}
        routeContext={{ source: 'entity-detail-next-action', timeRange: 'last-30m' }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-next-panel="hertzbeat-ui-next-panel"');
    expect(html).toContain('aria-label="Review alerts: Open alerts"');
    expect(html).toContain(
      'href="/alert?status=firing&amp;entityId=42&amp;timeRange=last-30m&amp;source=entity-detail-next-action"'
    );
    expect(html).not.toContain('href="https://example.invalid/phish"');
  });

  it('preserves list return context on advanced drilldown links', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{
          returnTo: '/entities?search=codex-pd-1506&source=product-design-1506&pageSize=50',
          source: 'product-design-1506'
        }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain(
      'href="/entities/42/edit?returnTo=%2Fentities%3Fsearch%3Dcodex-pd-1506%26source%3Dproduct-design-1506%26pageSize%3D50&amp;source=product-design-1506"'
    );
    expect(html).toContain(
      'href="/entities/42/definition?returnTo=%2Fentities%3Fsearch%3Dcodex-pd-1506%26source%3Dproduct-design-1506%26pageSize%3D50&amp;source=product-design-1506"'
    );
    expect(html).not.toContain('href="/entities/42/edit"');
  });

  it('renders English fallback cold entity detail copy and compact action rows', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface detail={detail} actionError={null} isPending={false} onDelete={() => undefined} onRefresh={() => undefined} />
    );

    expect(html).toContain('data-entity-detail-surface="otlp-hertzbeat-ui-entity-detail"');
    expect(html).toContain('data-entity-detail-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(html).toContain('data-entity-detail-header="hertzbeat-ui-compact-header"');
    expect(html).toContain('data-entity-detail-header-nesting-contract="flat-page-introduction"');
    expect(html).toContain('data-entity-detail-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-detail-evidence-chain="diagnosis-first"');
    expect(html).toContain('data-entity-detail-evidence-chain-state="alerts"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="entity-detail-evidence-chain-panel"');
    expect(html).toContain('aria-labelledby="entity-detail-evidence-chain-tab-alerts"');
    expect(html).toContain('data-entity-detail-evidence-chain-selected="true"');
    expect(html).toContain('data-entity-detail-evidence-chain-step="identity"');
    expect(html).toContain('data-entity-detail-evidence-chain-step="live"');
    expect(html).toContain('data-entity-detail-evidence-chain-step="alerts"');
    expect(html).toContain('data-entity-detail-evidence-chain-step="topology"');
    expect(html).toContain('data-entity-detail-evidence-chain-step="next"');
    expect(html).toContain('data-entity-detail-evidence-chain-priority="true"');
    expect(html).toContain('data-entity-detail-evidence-chain-diagnosis="alerts"');
    expect(html).toContain('data-entity-detail-evidence-chain-action="alerts"');
    expect(html).toContain('data-entity-detail-command-action="evidence-chain-alerts"');
    expect(html).toContain('Diagnostic path');
    expect(html).toContain('Active alerts');
    expect(html).toContain('Open alerts');
    expect(html).toContain('href="/alert?status=firing&amp;entityId=42');
    expect(html).not.toContain('aria-pressed="true"');
    expect(html.match(/data-entity-detail-action-help-style="icon-after-action"/g) || []).toHaveLength(1);
    expect(html.match(/data-entity-detail-action-help-visual="circle-help-icon"/g) || []).toHaveLength(1);
    expect(html.match(/data-entity-detail-action-help-icon="lucide-circle-help"/g) || []).toHaveLength(1);
    expect(html).toContain('data-entity-detail-command-row-help-contract="single-header-help"');
    expect(html).toContain('data-entity-detail-action-help="command-row"');
    expect(html).toContain('data-entity-detail-action-help-tooltip="command-row"');
    expect(html).not.toContain('data-entity-detail-action-help-item=');
    expect(html).toContain('data-entity-detail-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).not.toContain('>?</button>');
    expect(html).toContain('Return and Refresh are read-only.');
    expect(html).toContain('Edit definition changes identity and attribution evidence.');
    expect(html).toContain('Delete is guarded by an impact confirmation.');
    expect(html).toContain('data-entity-detail-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).toContain('data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"');
    expect(html).toContain('data-entity-detail-overview-panel="hertzbeat-ui-overview-panel"');
    expect(html).toContain('data-entity-detail-related-panel="hertzbeat-ui-related-panel"');
    expect(html).toContain('data-entity-detail-next-panel="hertzbeat-ui-next-panel"');
    expect(html).toContain('data-entity-detail-drilldown-panel="hertzbeat-ui-drilldown-panel"');
    expect(html).toContain('data-entity-detail-context-center="hertzbeat-entity-context"');
    expect(html).toContain('data-entity-detail-current-alerts="current-alerts"');
    expect(html).toContain('data-entity-detail-relationships-panel="upstream-downstream"');
    expect(html).toContain('data-entity-detail-collection-source-panel="source-template-binding"');
    expect(html).toContain('data-entity-detail-attribution-panel="entity-resource-attribution"');
    expect(html).toContain('data-entity-detail-attribution-row="traditional-monitor"');
    expect(html).toContain('data-entity-detail-attribution-row="otlp-attribution"');
    expect(html).toContain('data-entity-detail-attribution-row="candidate-confirmation"');
    expect(html).toContain('data-entity-detail-attribution-row="missing-diagnostics"');
    expect(html).toContain('data-entity-detail-template-binding="monitor-template-binding"');
    expect(html).toContain('data-entity-health-model="lightweight-service-health"');
    expect(html).toContain('data-entity-health-slo-mode="lightweight-no-slo-authoring"');
    expect(html).toContain('data-entity-detail-evidence-model="red-use-read-model"');
    expect(html).toContain('data-entity-detail-evidence-handoff="alert-topology-runbook"');
    expect(html).toContain('data-entity-detail-evidence-handoff-row="alerts"');
    expect(html).toContain('data-entity-detail-evidence-handoff-source="active-alerts"');
    expect(html).toContain('data-entity-detail-evidence-handoff-count="1"');
    expect(html).toContain('data-entity-detail-evidence-handoff-row="topology"');
    expect(html).toContain('data-entity-detail-evidence-handoff-source="topology-relation"');
    expect(html).toContain('data-entity-detail-evidence-handoff-row="runbook"');
    expect(html).toContain('data-entity-detail-evidence-handoff-source="runbook"');
    expect(html).toContain('aria-label="Active alert evidence: Open alert handling"');
    expect(html).toContain('aria-label="Topology context: calls · mysql-1"');
    expect(html).toContain('aria-label="Runbook: Response guidance"');
    expect(html).toContain('data-entity-health-collector-handoff="collector-cluster"');
    expect(html).toContain('data-entity-health-collector-freshness="last-seen"');
    expect(html).toContain('href="/setting/collector?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain(
      'href="/ingestion/otlp/metrics?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h'
    );
    expect(html).toContain('aria-label="Related metrics: Metrics workbench"');
    expect(html).toContain('aria-label="Related logs: Logs workbench"');
    expect(html).toContain('aria-label="Related traces: Traces workbench"');
    expect(html).toContain('returnTo=%2Fentities%2F42%3FentityId%3D42');
    expect(html).toContain('data-entity-detail-context-scope="metrics"');
    expect(html).toContain('Service checkout-api');
    expect(html).toContain(
      'href="/log/manage?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h'
    );
    expect(html).toContain(
      'href="/trace/manage?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h'
    );
    expect(html).toContain('href="/alert/setting?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain(
      'href="/alert?status=firing&amp;entityId=42&amp;entityType=service&amp;entityName=Checkout+API&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h'
    );
    expect(html).toContain(
      'href="/monitors?entityId=42&amp;entityType=service&amp;entityName=Checkout+API&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h'
    );
    expect(html).toContain('data-entity-detail-context-scope="monitors"');
    expect(html).toContain('Entity Checkout API · Service checkout-api');
    expect(html).toContain('href="/topology?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1h"');
    expect(html).toContain('topologyTargetId=mysql-1');
    expect(html).toContain('topologyTargetName=mysql-prod');
    expect(html).toContain('href="https://runbooks.local/checkout"');
    expect(html).toContain('href="/entities/42/definition"');
    expect(html).toContain('aria-label="Definition workspace: Next route"');
    expect(html).toContain('aria-label="Edit entity: Next route"');
    expect(html).toContain('aria-label="Telemetry discovery: Shared route"');
    expect(html).toContain('Entity-first investigation');
    expect(html).toContain('Entity detail');
    expect(html).toContain('Context');
    expect(html).toContain('Observability context');
    expect(html).toContain('Current alerts');
    expect(html).toContain('Related signals');
    expect(html).toContain('Upstream and downstream');
    expect(html).toContain('Collection source');
    expect(html).toContain('Traditional monitor binding');
    expect(html).toContain('OTLP attribution');
    expect(html).toContain('Candidate confirmation');
    expect(html).toContain('Attribution diagnostics');
    expect(html).toContain('Template binding');
    expect(html).toContain('Alert rules');
    expect(html).toContain('Monitor coverage');
    expect(html).toContain('Upstream topology');
    expect(html).toContain('Lightweight health model');
    expect(html).toContain('Evidence model');
    expect(html).toContain('RED / USE read model');
    expect(html).toContain('Active alert evidence');
    expect(html).toContain('Topology context');
    expect(html).toContain('Runbook');
    expect(html).toContain('3 active signals');
    expect(html).toContain('metrics · logs · traces');
    expect(html).toContain('Metrics / USE');
    expect(html).toContain('Logs / RED');
    expect(html).toContain('Traces / RED');
    expect(html).toContain('Availability');
    expect(html).toContain('Error rate');
    expect(html).toContain('Latency');
    expect(html).toContain('Current alerts');
    expect(html).toContain('Recent anomalies');
    expect(html).toContain('Collection health');
    expect(html).toContain('Collectors 1 / 2 online');
    expect(html).toContain('Tasks 11 · offline 1');
    expect(html).toContain('Last report 2026-04-10 18:05:00');
    expect(html).toContain('Health score');
    expect(html).toContain('without SLO authoring');
    expect(html).toContain('Next step');
    expect(html).toContain('Advanced entries');
    expect(html).toContain('All entities');
    expect(html).toContain('Refresh');
    expect(html).toContain('Edit definition');
    expect(html).toContain('Delete');
    expect(html).toContain('Edit');
    expect(html.indexOf('data-entity-detail-command-action="return"')).toBeLessThan(
      html.indexOf('data-entity-detail-command-action="refresh"')
    );
    expect(html.indexOf('data-entity-detail-command-action="refresh"')).toBeLessThan(
      html.indexOf('data-entity-detail-command-action="edit-definition"')
    );
    expect(html.indexOf('data-entity-detail-command-action="edit-definition"')).toBeLessThan(
      html.indexOf('data-entity-detail-command-action="edit"')
    );
    expect(html.indexOf('data-entity-detail-command-action="edit"')).toBeLessThan(
      html.indexOf('data-entity-detail-command-action="delete"')
    );
    expect(html).toContain(
      'data-entity-detail-command-action="delete" data-entity-detail-delete-confirm-trigger="hertzbeat-ui-modal"'
    );
    expect(html).toContain('Related metrics');
    expect(html).toContain('Inspect abnormal monitors first.');
    expect(html).toContain('/ingestion/otlp/metrics · entityId, entityType, serviceName');
    expect(html).not.toContain('/ingestion/otlp/metrics?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1hMetrics workbench');
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('Review the summary first');
    expect(html).not.toMatch(/\u5bf9\u8c61\u4f18\u5148\u8c03\u67e5/);
    expect(html).not.toMatch(/\u5173\u8054\u6307\u6807/);
    expect(html).not.toContain('definition workspace');
    expect(html).not.toContain('data-stage-section');
    expect(html).not.toContain('data-drawer-section');
  }, 30000);

  it('uses topology neighbor evidence for the detail relation count when relation samples are empty', () => {
    const highRelationDetail = {
      ...detail,
      entity: {
        ...detail.entity,
        relations: []
      },
      topologyNeighbors: [
        { entityId: 601, entityName: 'mysql-prod', relationType: 'depends_on' },
        { entityId: 602, entityName: 'redis-prod', relationType: 'depends_on' },
        { entityId: 603, entityName: 'payment-api', relationType: 'calls' },
        { entityId: 604, entityName: 'fraud-api', relationType: 'calls' }
      ]
    } as any;

    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={highRelationDetail}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-count-metric="relations"');
    expect(html).toMatch(/data-entity-detail-count-metric="relations"[\s\S]*?>4<\/span>/);
    expect(html).toContain('data-entity-detail-evidence-handoff-count="4"');
  });

  it('keeps large detail evidence summarized instead of rendering every backend row', () => {
    const scaleDetail = {
      ...detail,
      entity: {
        entity: {
          ...detail.entity.entity,
          labels: {
            environment: 'prod',
            namespace: 'payments',
            team: 'checkout'
          }
        },
        identities: Array.from({ length: 4 }, (_, index) => ({
          identityKey: index === 0 ? 'service.name' : `identity.${index}`,
          identityValue: index === 0 ? 'checkout-api' : `value-${index}`
        })),
        monitorBinds: [
          { templateName: 'spring-boot', monitorId: 7001 },
          { templateName: 'mysql', monitorId: 7002 },
          { templateName: 'redis', monitorId: 7003 }
        ],
        relations: []
      },
      activeAlerts: Array.from({ length: 24 }, (_, index) => ({
        id: `alert-${index + 1}`,
        status: 'firing',
        labels: { service: 'checkout', severity: index % 2 === 0 ? 'critical' : 'warning' },
        summary: `Checkout alert ${index + 1}`
      })),
      alertSummary: {
        totalActiveAlerts: 24
      },
      topologyNeighbors: Array.from({ length: 31 }, (_, index) => ({
        entityId: `neighbor-${index + 1}`,
        entityName: `Neighbor ${index + 1}`,
        relationType: index % 2 === 0 ? 'calls' : 'depends_on'
      }))
    } as any;

    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={scaleDetail}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-workspace-panel="alerts"');
    expect(html).toContain('data-entity-detail-workspace-panel="relationships"');
    expect(html).toContain('data-entity-detail-workspace-panel="source"');
    expect(html).toContain(message('en-US', 'entities.detail.alert-row.overflow.copy', { count: 16 }));
    expect(html).toContain(message('en-US', 'entities.detail.relationship-row.overflow.copy', { count: 23 }));
    expect(html).toContain(message('en-US', 'entities.detail.collection.identity.more', { count: 2 }));
    expect(html).toContain(message('en-US', 'entities.detail.collection.template.more', { count: 1 }));
    expect(html).toContain(message('en-US', 'entities.detail.collection.labels.more', { count: 1 }));
    expect(html).toContain('Checkout alert 8');
    expect(html).not.toContain('Checkout alert 24');
    expect(html).toContain('Neighbor 8');
    expect(html).not.toContain('Neighbor 31');
    expect((html.match(/Current alert #alert-/g) || []).length).toBe(8);
    expect((html.match(/href="\/entities\/neighbor-/g) || []).length).toBe(8);
  });

  it('guards novice entity deletion with impact confirmation before calling delete', async () => {
    const onDelete = vi.fn();
    const onRefresh = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <EntityDetailSurface
          detail={detail}
          actionError={null}
          isPending={false}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      );
      await Promise.resolve();
    });

    const refreshButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.includes(message('en-US', 'common.refresh'))
    );
    await act(async () => {
      refreshButton?.click();
      await Promise.resolve();
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    const deleteTrigger = container.querySelector<HTMLButtonElement>('[data-entity-detail-delete-confirm-trigger="hertzbeat-ui-modal"]');
    expect(deleteTrigger).not.toBeNull();
    await act(async () => {
      deleteTrigger?.click();
      await Promise.resolve();
    });

    expect(onDelete).not.toHaveBeenCalled();
    expect(container.querySelector('[data-entity-detail-delete-confirm="hertzbeat-ui-modal"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-detail-delete-impact-summary="read-model-counts"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-detail-delete-impact-warning="has-related-evidence"]')).not.toBeNull();

    const cancelButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.trim() === message('en-US', 'entities.detail.delete.cancel')
    );
    await act(async () => {
      cancelButton?.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-entity-detail-delete-confirm="hertzbeat-ui-modal"]')).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();

    await act(async () => {
      deleteTrigger?.click();
      await Promise.resolve();
    });

    const confirmButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      button => button.textContent?.trim() === message('en-US', 'entities.detail.delete.confirm')
    );
    await act(async () => {
      confirmButton?.click();
      await Promise.resolve();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(42);
    expect(container.querySelector('[data-entity-detail-delete-confirm="hertzbeat-ui-modal"]')).toBeNull();
  });

  it('uses the active Chinese locale for entity detail copy instead of forcing English fallback', () => {
    i18nMock.locale = 'zh-CN';

    const html = renderToStaticMarkup(
      <EntityDetailSurface detail={detail} actionError={null} isPending={false} onDelete={() => undefined} onRefresh={() => undefined} />
    );

    expect(html).toContain(message('zh-CN', 'entities.detail.header.kicker'));
    expect(html).toContain(message('zh-CN', 'entities.detail.header.badge'));
    expect(html).toContain(message('zh-CN', 'entities.detail.action.all-entities'));
    expect(html).toContain(message('zh-CN', 'entities.detail.action.edit-definition'));
    expect(html).toContain(message('zh-CN', 'entities.detail.chain.title'));
    expect(html).toContain(message('zh-CN', 'entities.detail.chain.alerts.active'));
    expect(html).toContain(message('zh-CN', 'entities.detail.panel.context.title'));
    expect(html).toContain(message('zh-CN', 'entities.detail.handoff.metrics.title'));
    expect(html).toContain('/ingestion/otlp/metrics · entityId, entityType, serviceName');
    expect(html).not.toContain(message('en-US', 'entities.detail.header.kicker'));
    expect(html).not.toContain(message('en-US', 'entities.detail.action.all-entities'));
    expect(html).not.toContain(message('en-US', 'entities.detail.panel.context.title'));
    expect(html).not.toContain('/ingestion/otlp/metrics?entityId=42&amp;entityType=service&amp;serviceName=checkout-api&amp;environment=prod&amp;timeRange=last-1hMetrics workbench');
  }, 30000);

  it('keeps unavailable fallback details in a safe read-only recovery state', () => {
    const unavailableDetail = {
      ...detail,
      entity: {
        ...detail.entity,
        entity: {
          ...detail.entity.entity,
          id: 1,
          name: 'entity-1',
          displayName: 'Entity 1',
          status: 'unavailable',
          description: 'Temporary workspace shown while backend entity detail is unavailable.'
        }
      },
      detailState: {
        state: 'unavailable',
        message: 'Detail unavailable',
        reason: 'recoverable-detail-load-failed'
      },
      evidenceSummary: {
        activeAlertCount: 0,
        downMonitorCount: 0,
        healthyMonitorCount: 0,
        identityCount: 0,
        logHintCount: 0,
        lastEvidenceAt: null
      },
      monitorSummary: {
        totalBoundMonitors: 0
      },
      activeAlerts: [],
      alertSummary: {
        totalActiveAlerts: 0
      },
      nextActions: []
    } as any;

    const html = renderToStaticMarkup(
      <EntityDetailSurface detail={unavailableDetail} actionError={null} isPending={false} onDelete={() => undefined} onRefresh={() => undefined} />
    );

    expect(html).toContain('data-entity-detail-unavailable-feedback="backend-detail-unavailable"');
    expect(html).toContain('data-entity-detail-unavailable-actions="safe-return-refresh-only"');
    expect(html).toContain('Backend evidence unavailable; not an empty read model.');
    expect(html).not.toContain('Logs, traces, or monitor evidence are linked and ready for investigation.');
    expect(html).toContain('data-entity-detail-missing-recovery="backend-unavailable"');
    expect(html).toContain('data-entity-detail-missing-recovery-actions="return-refresh-only"');
    expect(html).toContain('Entity detail is temporarily unavailable');
    expect(html).toContain('no healthy, zero, or resolved state is inferred here');
    expect(html).toContain('All entities');
    expect(html).toContain('Refresh');
    expect(html).not.toContain('Edit definition');
    expect(html).not.toContain('Delete');
    expect(html).not.toContain('data-entity-detail-delete-confirm-trigger="hertzbeat-ui-modal"');
    expect(html).not.toContain('href="/entities/1/edit');
    expect(html).not.toContain('href="/entities/1/definition');
    expect(html).not.toContain('href="/log/manage?entityId=1');
    expect(html).not.toContain('href="/trace/manage?entityId=1');
    expect(html).not.toContain('href="/alert/setting?entityId=1');
    expect(html).not.toContain('data-entity-detail-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).not.toContain('data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"');
    expect(html).not.toContain('data-entity-detail-drilldown-panel="hertzbeat-ui-drilldown-panel"');
  });

  it('renders a deleted or missing entity deep link as a clear recovery state instead of a fake detail workspace', () => {
    const missingDetail = {
      ...detail,
      entity: {
        ...detail.entity,
        entity: {
          ...detail.entity.entity,
          id: 658587734981888,
          name: 'entity-658587734981888',
          displayName: 'Entity 658587734981888',
          status: 'unavailable',
          description: message('en-US', 'entities.detail.state.missing.description')
        }
      },
      detailState: {
        state: 'unavailable',
        message: message('en-US', 'entities.detail.state.missing.copy'),
        reason: 'entity-detail-missing'
      },
      evidenceSummary: {
        activeAlertCount: 0,
        downMonitorCount: 0,
        healthyMonitorCount: 0,
        identityCount: 0,
        logHintCount: 0,
        lastEvidenceAt: null
      },
      monitorSummary: {
        totalBoundMonitors: 0
      },
      activeAlerts: [],
      alertSummary: {
        totalActiveAlerts: 0
      },
      nextActions: []
    } as any;

    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={missingDetail}
        routeContext={{ returnTo: '/entities/discovery?search=Codex' }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('data-entity-detail-unavailable-feedback="entity-deleted-or-missing"');
    expect(html).toContain('data-entity-detail-missing-recovery="deleted-or-not-found"');
    expect(html).toContain(message('en-US', 'entities.detail.state.missing.copy'));
    expect(html).toContain(message('en-US', 'entities.detail.state.missing.recovery-title'));
    expect(html).toContain(message('en-US', 'entities.detail.state.missing.recovery-copy'));
    expect(html).not.toContain('Logs, traces, or monitor evidence are linked and ready for investigation.');
    expect(html).toContain('href="/entities/discovery?search=Codex"');
    expect(html).not.toContain('data-entity-detail-count-strip="hertzbeat-ui-inline-counts"');
    expect(html).not.toContain('data-entity-detail-signal-grid="hertzbeat-ui-detail-grid"');
    expect(html).not.toContain('data-entity-detail-context-link=');
    expect(html).not.toContain('href="/log/manage?entityId=658587734981888');
    expect(html).not.toContain('href="/trace/manage?entityId=658587734981888');
    expect(html).not.toContain('href="/alert/setting?entityId=658587734981888');
    expect(html).not.toContain('data-entity-detail-delete-confirm-trigger="hertzbeat-ui-modal"');
  });

  it('does not treat log query hints as linked evidence without actual signal results', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={{
          entity: {
            entity: {
              id: 76,
              name: 'manual-service',
              displayName: 'Manual Service',
              type: 'service',
              status: 'unknown'
            },
            monitorBinds: []
          },
          evidenceSummary: {
            downMonitorCount: 0
          },
          monitorSummary: {
            totalBoundMonitors: 0
          },
          alertSummary: {
            totalActiveAlerts: 0
          },
          signalEvidence: {
            logSummary: { hintCount: 2 },
            traceSummary: { recentTraceCount: 0 },
            logEvidence: [{ query: 'service.name="manual-service"' }]
          },
          unifiedEvidenceSummary: {
            metricEvidenceCount: 0,
            logEvidenceCount: 1,
            traceEvidenceCount: 0
          },
          status: {
            reason: 'no live evidence bound yet'
          }
        } as any}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('Add owner, definition, and telemetry binding so this entity becomes usable.');
    expect(html).not.toContain('Logs, traces, or monitor evidence are linked and ready for investigation.');
  });

  it('does not ask for ownership again when identity context exists but live evidence is missing', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={{
          entity: {
            entity: {
              id: 78,
              name: 'owned-service',
              displayName: 'Owned Service',
              type: 'service',
              status: 'unknown',
              owner: 'platform'
            },
            identities: [{ identityKey: 'service.name', identityValue: 'owned-service' }],
            monitorBinds: []
          },
          evidenceSummary: {
            downMonitorCount: 0,
            identityCount: 1
          },
          monitorSummary: {
            totalBoundMonitors: 0
          },
          alertSummary: {
            totalActiveAlerts: 0
          },
          status: {
            reason: 'no live evidence bound yet'
          }
        } as any}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('Identity or owner context is already available. Bind a monitor or ingest live OTLP evidence to make this entity actionable.');
    expect(html).toContain('data-entity-detail-evidence-chain="diagnosis-first"');
    expect(html).toContain('data-entity-detail-evidence-chain-state="live"');
    expect(html).toContain('aria-labelledby="entity-detail-evidence-chain-tab-live"');
    expect(html).toContain('data-entity-detail-evidence-chain-selected="true"');
    expect(html).toContain('data-entity-detail-evidence-chain-step="live"');
    expect(html).toContain('data-entity-detail-evidence-chain-priority="true"');
    expect(html).toContain('data-entity-detail-evidence-chain-diagnosis="live"');
    expect(html).toContain('data-entity-detail-evidence-chain-action="live"');
    expect(html).toContain('Live evidence missing');
    expect(html).toContain('No live monitor, metric, log, or trace evidence is linked yet. Bind a monitor or ingest OTLP before judging health.');
    expect(html).toContain('Bind monitor');
    expect(html).toContain('href="/entities/78/edit?stage=signals"');
    expect(html).toContain('data-entity-detail-command-action="evidence-chain-live"');
    expect(html).toContain('data-entity-detail-evidence-chain-action="live"');
    expect(html).not.toContain('Add owner, definition, and telemetry binding so this entity becomes usable.');
  });

  it('uses shared signal evidence when deciding whether the entity has investigation context', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={{
          entity: {
            entity: {
              id: 77,
              name: 'payment-api',
              displayName: 'Payment API',
              type: 'service',
              status: 'healthy'
            }
          },
          evidenceSummary: {
            downMonitorCount: 0
          },
          alertSummary: {
            totalActiveAlerts: 0
          },
          signalEvidence: {
            logSummary: { hintCount: 2 },
            traceSummary: { recentTraceCount: 3 }
          }
        } as any}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('Logs, traces, or monitor evidence are linked and ready for investigation.');
    expect(html).not.toContain('Add owner, definition, and telemetry binding so this entity becomes usable.');
  });

  it('renders entity context handoff links with inherited time and monitor context', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{
          timeRange: 'last-45m',
          start: '1713200000000',
          end: '1713202700000',
          refresh: '30',
          live: 'false',
          tz: 'Asia/Shanghai',
          pageSize: '8',
          source: 'monitor',
          monitorId: '632051474676992',
          monitorName: 'checkout-http',
          monitorApp: 'website',
          monitorInstance: 'example.com:443',
          probe: 'entity-definition-link'
        }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain('href="/ingestion/otlp/metrics?entityId=42&amp;entityType=service&amp;serviceName=checkout-api');
    expect(html).toContain('timeRange=last-45m&amp;start=1713200000000&amp;end=1713202700000&amp;refresh=30&amp;live=false');
    expect(html).toContain('source=monitor&amp;monitorId=632051474676992&amp;monitorName=checkout-http');
    expect(html).toContain('monitorApp=website&amp;monitorInstance=example.com%3A443');
    expect(html).toContain('href="/entities?start=1713200000000&amp;end=1713202700000&amp;timeRange=last-45m');
    expect(html).toContain('href="/entities/42/definition?start=1713200000000&amp;end=1713202700000&amp;timeRange=last-45m');
    expect(html).toContain('pageSize=8');
    expect(html).toContain('probe=entity-definition-link');
    expect(html).toContain('href="/entities/42/edit?start=1713200000000&amp;end=1713202700000&amp;timeRange=last-45m');
    expect(html).toContain('monitorId=632051474676992&amp;monitorName=checkout-http&amp;monitorApp=website');
    expect(html).toContain('href="/topology?entityId=42&amp;entityType=service&amp;serviceName=checkout-api');
    expect(html).toContain('topologyTargetId=mysql-1&amp;topologyTargetName=mysql-prod');
    expect(html).toContain('data-entity-detail-inherited-context="route-context"');
    expect(html).toContain('data-entity-detail-inherited-context-row="Time range"');
    expect(html).toContain('last-45m');
    expect(html).toContain('2024/04/16 00:53:20 → 2024/04/16 01:38:20 · Refresh 30s · Paused · Asia/Shanghai');
    expect(html).toContain('data-entity-detail-inherited-context-row="Monitor instance"');
    expect(html).toContain('checkout-http');
    expect(html).toContain('website · example.com:443 · monitorId 632051474676992');
    expect(html).toContain('data-entity-detail-inherited-context-row="Source"');
    expect(html).toContain('Traditional monitoring');
    expect(html).not.toMatch(/0 \u4e2a\u8bc1\u636e/);
    expect(html).not.toContain('0 evidence');
  }, 30000);

  it('returns directly to the inherited entity list URL from the all entities action', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{
          returnTo: '/entities?search=checkout&type=service&source=entity-list&pageSize=8&timeRange=last-30m&live=false&probe=row-handoff',
          source: 'entity-list'
        }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain(
      'href="/entities?search=checkout&amp;type=service&amp;source=entity-list&amp;pageSize=8&amp;timeRange=last-30m&amp;live=false&amp;probe=row-handoff"'
    );
    expect(html).not.toContain('href="/entities?returnTo=');
    expect(html).toContain('Back to entity list');
    expect(html).toContain('preserving search, filters, pagination, and signal context');
    expect(html).not.toContain('All entities</a>');
    expect(html).toContain(
      'href="/entities/42/definition?returnTo=%2Fentities%3Fsearch%3Dcheckout%26type%3Dservice%26source%3Dentity-list%26pageSize%3D8%26timeRange%3Dlast-30m%26live%3Dfalse%26probe%3Drow-handoff&amp;source=entity-list"'
    );
  });

  it('labels inherited discovery return URLs as entity discovery', () => {
    const html = renderToStaticMarkup(
      <EntityDetailSurface
        detail={detail}
        routeContext={{
          returnTo:
            '/entities/discovery?identityKey=service.name&identityValue=checkout&serviceName=checkout-api&serviceNamespace=commerce&environment=prod',
          source: 'otlp-candidate'
        }}
        actionError={null}
        isPending={false}
        onDelete={() => undefined}
        onRefresh={() => undefined}
      />
    );

    expect(html).toContain(
      'href="/entities/discovery?identityKey=service.name&amp;identityValue=checkout&amp;serviceName=checkout-api&amp;serviceNamespace=commerce&amp;environment=prod"'
    );
    expect(html).toContain('Back to entity discovery');
    expect(html).toContain('preserving identity, namespace, and environment context');
    expect(html).not.toContain('Back to entity list');
  });
});
