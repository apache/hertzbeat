import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({ t })
}));

describe('actions page', () => {
  it('renders the OTLP hertzbeat-ui entry shell without the previous placeholder stack', async () => {
    const routeSource = readFileSync(resolve(process.cwd(), 'app/actions/page.tsx'), 'utf8');
    const source = readFileSync(resolve(process.cwd(), 'app/actions/actions-page.tsx'), 'utf8');
    const { default: ActionsPage } = await import('./actions-page');
    const html = renderToStaticMarkup(<ActionsPage />);

    expect(routeSource).toContain("import ActionsPage from './actions-page'");
    expect(routeSource).toContain("import { readActionsSuggestionContext, type ActionsSearchParams } from '../../lib/actions-surface/query-state'");
    expect(routeSource).toContain('const resolvedSearchParams = await searchParams');
    expect(routeSource).toContain('const suggestionContext = readActionsSuggestionContext(resolvedSearchParams)');
    expect(routeSource).toContain('return <ActionsPage suggestionContext={suggestionContext} />');
    expect(html).toContain('data-actions-route="otlp-hertzbeat-ui-ops-entry"');
    expect(html).toContain('data-actions-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-actions-placeholder-replacement="api-backed-workbench"');
    expect(html).toContain('data-actions-legacy-open-context="adapter-boundary-panel"');
    expect(html).toContain('data-actions-legacy-entity-handoff="/entities"');
    expect(html).toContain('data-actions-shared-workbench="hertzbeat-ui"');
    expect(html).toContain('data-hz-ui="action-workbench"');
    expect(html).toContain('data-hz-action-workbench-owner="hertzbeat-ui-action-workbench"');
    expect(html).toContain('data-hz-action-workbench-density="operator-compact"');
    expect(html).toContain('data-hz-action-workbench-style="hertzbeat-ui-matte-hard-edge"');
    expect(html).toContain('data-actions-shell-panel="hertzbeat-ui-ops-shell-panel"');
    expect(html).toContain('data-actions-launch-checklist="hertzbeat-ui-ops-static-rail"');
    expect(html).toContain('data-actions-adapter-boundary="adapter-pending"');
    expect(html).toContain('data-actions-catalog="manual-action-catalog-api"');
    expect(html).toContain('data-actions-catalog-state="loading"');
    expect(html).toContain('data-actions-catalog-owner="next-actions-catalog-bff"');
    expect(html).toContain('data-actions-catalog-endpoint="/api/actions/catalog?limit=8"');
    expect(html).toContain('data-actions-catalog-manager-backed="false"');
    expect(html).toContain('data-actions-catalog-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-catalog-execution-allowed="false"');
    expect(html).toContain('data-actions-catalog-item-count="0"');
    expect(html).toContain('data-actions-approval-draft="manual-approval-draft-api"');
    expect(html).toContain('data-actions-approval-draft-state="awaiting-context"');
    expect(html).toContain('data-actions-approval-draft-owner="next-actions-approval-draft-bff"');
    expect(html).toContain('data-actions-approval-draft-endpoint="/api/actions/approval-drafts"');
    expect(html).toContain('data-actions-approval-draft-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-approval-draft-execution-allowed="false"');
    expect(html).toContain('data-actions-approval-draft-queue="manual-approval-draft-read-api"');
    expect(html).toContain('data-actions-approval-draft-queue-state="loading"');
    expect(html).toContain('data-actions-approval-draft-queue-owner="next-actions-approval-draft-bff"');
    expect(html).toContain('data-actions-approval-draft-queue-endpoint="/api/actions/approval-drafts?limit=8"');
    expect(html).toContain('data-actions-approval-draft-queue-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-approval-draft-queue-execution-allowed="false"');
    expect(html).toContain('data-actions-approval-decision="manual-approval-decision-api"');
    expect(html).toContain('data-actions-approval-decision-state="awaiting-draft"');
    expect(html).toContain('data-actions-approval-decision-owner="next-actions-approval-decision-bff"');
    expect(html).toContain('data-actions-approval-decision-endpoint="/api/actions/approval-drafts/:draftId/decision"');
    expect(html).toContain('data-actions-approval-decision-execution-mode="manual-approval-draft-only"');
    expect(html).toContain('data-actions-approval-decision-execution-allowed="false"');
    expect(html).toContain('data-actions-empty-state="hertzbeat-ui-ops-domain-adapter"');
    expect(html).toContain(t('actions.entry.title'));
    expect(html).toContain(t('actions.entry.subtitle'));
    expect(html).toContain(t('actions.entry.shell.eyebrow'));
    expect(html).toContain(t('actions.adapter-boundary.label'));
    expect(html).toContain(t('actions.adapter-boundary.copy'));
    expect(html).toContain(t('actions.adapter-boundary.roadmap.workflow-automation'));
    expect(html).toContain(t('actions.adapter-boundary.roadmap.runbook-orchestration'));
    expect(html).not.toContain('workflow-automation');
    expect(html).not.toContain('runbook-orchestration');
    expect(html).toContain(t('actions.entry.empty.title'));
    expect(html).toContain(t('actions.entry.action.overview'));
    expect(html).toContain(t('actions.entry.action.entities'));
    expect(html).toContain(t('actions.entry.chip.catalog'));
    expect(html).toContain(t('actions.entry.chip.risk'));
    expect(html).toContain(t('actions.entry.chip.approval'));
    expect(html).toContain(t('actions.entry.checklist.context.title'));
    expect(html).toContain(t('actions.entry.checklist.adapter.title'));
    expect(html).toContain(t('actions.entry.checklist.evidence.title'));
    expect(html).not.toContain('angular-dark-ops-placeholder');
    expect(html).not.toContain('DARK OPS');
    expect(html).not.toContain('V1 SHELL IS LIVE');
    expect(html).not.toContain('Domain adapter comes next');
    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('HzActionWorkbench');
    expect(source).toContain('data-actions-placeholder-replacement="api-backed-workbench"');
    expect(source).toContain('data-actions-legacy-open-context="adapter-boundary-panel"');
    expect(source).toContain('data-actions-legacy-entity-handoff="/entities"');
    expect(source).toContain('fetch(state.catalogAdapter.endpoint');
    expect(source).toContain('fetch(state.approvalDraft.endpoint');
    expect(source).toContain('fetch(state.approvalDraftQueue.endpoint');
    expect(source).toContain('fetch(endpoint');
    expect(source).toContain('buildApprovalDecisionRequestPreview');
    expect(source).toContain("approvalDecisionResult?.decision");
    expect(source).not.toContain("decision: 'approved',");
    expect(source).not.toContain('rounded-[16px]');
    expect(source).not.toContain('rounded-[14px]');
    expect(source).not.toContain('#4f6cff');
    expect(source).not.toContain('#101c31');
    expect(html).not.toContain('Restart checkout deployment');
    expect(html).not.toContain('Catalog posture');
    expect(html).not.toContain('data-summary-metric-grid');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
  });

  it('renders alert-context suggested remediation actions as human-confirmed suggestions only', async () => {
    const { default: ActionsPage } = await import('./actions-page');
    const html = renderToStaticMarkup(
      <ActionsPage
        suggestionContext={{
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
          returnTo: `/alert?status=firing&returnLabel=${encodeURIComponent(t('alert.center.default-title'))}`
        }}
      />
    );

    expect(html).toContain('data-actions-suggested-remediation="alert-context-human-confirmation"');
    expect(html).toContain('data-hz-action-workbench-owner="hertzbeat-ui-action-workbench"');
    expect(html).toContain('data-actions-adapter-boundary="adapter-pending"');
    expect(html).toContain(t('actions.entry.suggested.title'));
    expect(html).toContain(t('actions.entry.suggested.copy'));
    expect(html).toContain('data-actions-suggested-action="suggest-restart-checkout"');
    expect(html).toContain(t('actions.suggestion.restart.title', { target: 'checkout-api' }));
    expect(html).toContain(`${t('actions.risk.high')} · ${t('actions.catalog.restart.name')}`);
    expect(html).toContain(`${t('actions.risk.medium')} · ${t('actions.catalog.mute.name')}`);
    expect(html).not.toContain('high risk · restart-checkout');
    expect(html).not.toContain('medium risk · mute-edge-alerts');
    expect(html).toContain(t('actions.suggestion.evidence.source', { value: t('actions.suggestion.source.alert') }));
    expect(html).toContain(t('actions.suggestion.evidence.signal', { value: t('actions.suggestion.signal.traces') }));
    expect(html).not.toContain(t('actions.suggestion.evidence.source', { value: 'alert' }));
    expect(html).not.toContain(t('actions.suggestion.evidence.signal', { value: 'traces' }));
    expect(html).toContain('data-actions-suggested-action-confirm="manual-required"');
    expect(html).toContain('data-actions-approval-draft-state="ready"');
    expect(html).toContain('data-actions-approval-draft-status="ready"');
    expect(html).toContain('data-actions-approval-draft-request="preview"');
    expect(html).toContain('&quot;actionId&quot;:&quot;suggest-restart-checkout&quot;');
    expect(html).toContain('&quot;executionAllowed&quot;:false');
    expect(html).toContain(t('actions.entry.suggested.confirm'));
    expect(html).toContain('data-actions-suggested-action-evidence="suggest-restart-checkout"');
    expect(html).toContain('/alert?status=firing');
    expect(html).toContain('traceId=trace-123');
    expect(html).not.toContain('data-actions-auto-execute');
    expect(html).not.toContain('/actions/run');
  });

  it('does not enable suggested actions from route tracking source params alone', async () => {
    const { default: ActionsPage } = await import('./actions-page');
    const html = renderToStaticMarkup(
      <ActionsPage
        suggestionContext={{
          source: 'product-design-1590-default'
        }}
      />
    );

    expect(html).not.toContain('data-actions-suggested-remediation="alert-context-human-confirmation"');
    expect(html).toContain('data-actions-approval-draft-state="awaiting-context"');
    expect(html).toContain('data-actions-approval-draft-status="blocked"');
    expect(html).toContain(t('actions.approval-draft.disabled'));
    expect(html).not.toContain('&quot;actionId&quot;:&quot;suggest-restart-checkout&quot;');
  });

  it('renders entity-id-only suggested remediation targets with localized fallback copy', async () => {
    const { default: ActionsPage } = await import('./actions-page');
    const html = renderToStaticMarkup(
      <ActionsPage
        suggestionContext={{
          entityId: 'service:commerce/checkout',
          source: 'entity',
          returnTo: `/entities/service%3Acommerce%2Fcheckout?returnLabel=${encodeURIComponent(t('actions.suggestion.source.entity'))}`
        }}
      />
    );

    expect(html).toContain(t('actions.suggestion.restart.title', {
      target: t('actions.suggestion.target.entity-id', { entityId: 'service:commerce/checkout' })
    }));
    expect(html).not.toContain(t('actions.suggestion.restart.title', { target: 'service:commerce/checkout' }));
    expect(html).toContain('entityId=service%3Acommerce%2Fcheckout');
    expect(html).not.toContain('returnLabel=');
  });
});
