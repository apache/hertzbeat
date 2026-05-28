'use client';

import React from 'react';
import { HzActionWorkbench } from '@hertzbeat/ui';
import { useI18n } from '../../components/providers/i18n-provider';
import { buildActionsPlaceholderState } from '../../lib/actions-surface/view-model';
import type { ActionSuggestionContext } from '../../lib/actions-surface/model';
import { coldOpsCatalogVisual } from '../../lib/cold-ops-visual';

type ApprovalDraftResult = {
  draftId: string;
  state: string;
  executionState: string;
  actionId?: string;
  catalogId?: string;
  adapterOwner?: string;
  managerBacked?: boolean;
};

type ApprovalDecisionResult = {
  draftId: string;
  decision: string;
  state: string;
  executionState: string;
  adapterOwner?: string;
  managerBacked?: boolean;
};

type ActionCatalogResult = {
  state: string;
  adapterOwner: string;
  managerBacked: boolean;
  items: Array<{
    catalogId?: string;
    name?: string;
    risk?: string;
    status?: string;
    executionMode?: string;
    adapterOwner?: string;
  }>;
};

type ApprovalDraftQueueResult = {
  state: string;
  adapterOwner: string;
  managerBacked: boolean;
  drafts: ApprovalDraftResult[];
};

export default function ActionsPage({ suggestionContext }: { suggestionContext?: ActionSuggestionContext } = {}) {
  const { t } = useI18n();
  const state = buildActionsPlaceholderState(t, suggestionContext);
  const coldOpsVisual = coldOpsCatalogVisual;
  const [approvalDraftStatus, setApprovalDraftStatus] = React.useState<'ready' | 'submitting' | 'created' | 'failed' | 'blocked'>(
    state.approvalDraft.state === 'ready' ? 'ready' : 'blocked'
  );
  const [approvalDraftResult, setApprovalDraftResult] = React.useState<ApprovalDraftResult | undefined>();
  const [approvalDraftError, setApprovalDraftError] = React.useState<string | undefined>();
  const [approvalDecisionStatus, setApprovalDecisionStatus] = React.useState<'blocked' | 'ready' | 'submitting' | 'decided' | 'failed'>('blocked');
  const [approvalDecisionResult, setApprovalDecisionResult] = React.useState<ApprovalDecisionResult | undefined>();
  const [approvalDecisionError, setApprovalDecisionError] = React.useState<string | undefined>();
  const [catalogResult, setCatalogResult] = React.useState<ActionCatalogResult>({
    state: state.catalogAdapter.state,
    adapterOwner: state.catalogAdapter.adapterOwner,
    managerBacked: state.catalogAdapter.managerBacked,
    items: []
  });
  const [approvalDraftQueueResult, setApprovalDraftQueueResult] = React.useState<ApprovalDraftQueueResult>({
    state: state.approvalDraftQueue.state,
    adapterOwner: state.approvalDraftQueue.adapterOwner,
    managerBacked: state.approvalDraftQueue.managerBacked,
    drafts: []
  });

  const loadApprovalDraftQueue = React.useCallback(async () => {
    try {
      const response = await fetch(state.approvalDraftQueue.endpoint, { method: state.approvalDraftQueue.method });
      const payload = await response.json() as ApprovalDraftQueueResult & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'approval draft queue read failed');
      setApprovalDraftQueueResult({
        state: payload.state,
        adapterOwner: payload.adapterOwner,
        managerBacked: Boolean(payload.managerBacked),
        drafts: Array.isArray(payload.drafts) ? payload.drafts : []
      });
    } catch {
      setApprovalDraftQueueResult({
        state: 'failed',
        adapterOwner: 'next-actions-approval-draft-bff',
        managerBacked: false,
        drafts: []
      });
    }
  }, [state.approvalDraftQueue.endpoint, state.approvalDraftQueue.method]);

  React.useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const response = await fetch(state.catalogAdapter.endpoint, { method: state.catalogAdapter.method });
        const payload = await response.json() as ActionCatalogResult & { message?: string };
        if (!response.ok) throw new Error(payload.message || 'catalog read failed');
        if (active) {
          setCatalogResult({
            state: payload.state,
            adapterOwner: payload.adapterOwner,
            managerBacked: Boolean(payload.managerBacked),
            items: Array.isArray(payload.items) ? payload.items : []
          });
        }
      } catch {
        if (active) {
          setCatalogResult({
            state: 'failed',
            adapterOwner: 'next-actions-catalog-bff',
            managerBacked: false,
            items: []
          });
        }
      }
    }
    void loadCatalog();
    return () => {
      active = false;
    };
  }, [state.catalogAdapter.endpoint, state.catalogAdapter.method]);

  React.useEffect(() => {
    void loadApprovalDraftQueue();
  }, [loadApprovalDraftQueue]);

  React.useEffect(() => {
    if (approvalDraftResult?.draftId) {
      setApprovalDecisionStatus('ready');
      setApprovalDecisionResult(undefined);
      setApprovalDecisionError(undefined);
    } else {
      setApprovalDecisionStatus('blocked');
    }
  }, [approvalDraftResult?.draftId]);

  async function createApprovalDraft() {
    if (!state.approvalDraft.request) return;
    setApprovalDraftStatus('submitting');
    setApprovalDraftError(undefined);
    try {
      const response = await fetch(state.approvalDraft.endpoint, {
        method: state.approvalDraft.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state.approvalDraft.request)
      });
      const payload = await response.json() as ApprovalDraftResult & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'approval draft failed');
      setApprovalDraftResult({
        draftId: payload.draftId,
        state: payload.state,
        executionState: payload.executionState,
        actionId: payload.actionId,
        catalogId: payload.catalogId,
        adapterOwner: payload.adapterOwner,
        managerBacked: payload.managerBacked
      });
      setApprovalDraftStatus('created');
      void loadApprovalDraftQueue();
    } catch (error) {
      setApprovalDraftError(error instanceof Error ? error.message : 'approval draft failed');
      setApprovalDraftStatus('failed');
    }
  }

  async function decideApprovalDraft(decision: 'approved' | 'rejected') {
    if (!approvalDraftResult?.draftId) return;
    const endpoint = state.approvalDecision.endpointTemplate.replace(
      ':draftId',
      encodeURIComponent(approvalDraftResult.draftId)
    );
    setApprovalDecisionStatus('submitting');
    setApprovalDecisionError(undefined);
    try {
      const response = await fetch(endpoint, {
        method: state.approvalDecision.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decision,
          reviewer: 'hertzbeat-ui-operator',
          reason: 'manual approval decision from actions workbench',
          executionMode: state.approvalDecision.executionMode,
          executionAllowed: false
        })
      });
      const payload = await response.json() as ApprovalDecisionResult & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'approval decision failed');
      setApprovalDecisionResult({
        draftId: payload.draftId,
        decision: payload.decision,
        state: payload.state,
        executionState: payload.executionState,
        adapterOwner: payload.adapterOwner,
        managerBacked: payload.managerBacked
      });
      setApprovalDecisionStatus('decided');
      void loadApprovalDraftQueue();
    } catch (error) {
      setApprovalDecisionError(error instanceof Error ? error.message : 'approval decision failed');
      setApprovalDecisionStatus('failed');
    }
  }

  const approvalDecisionEndpoint = approvalDraftResult?.draftId
    ? state.approvalDecision.endpointTemplate.replace(':draftId', encodeURIComponent(approvalDraftResult.draftId))
    : state.approvalDecision.endpointTemplate;

  return (
    <main
      className={coldOpsVisual.entry.main}
      data-actions-route="otlp-cold-ops-entry"
      data-actions-style-baseline={coldOpsVisual.canvasName}
      data-actions-placeholder-replacement="api-backed-workbench"
      data-actions-legacy-open-context="adapter-boundary-panel"
      data-actions-legacy-entity-handoff="/entities"
    >
      <div className={coldOpsVisual.entry.container}>
        <HzActionWorkbench
          data-actions-shared-workbench="hertzbeat-ui"
          data-actions-placeholder-replacement="api-backed-workbench"
          data-actions-legacy-open-context="adapter-boundary-panel"
          data-actions-legacy-entity-handoff="/entities"
          title={state.title}
          subtitle={state.subtitle}
          sourceLabel={state.kicker}
          actions={state.actions}
          shell={state.shell}
          adapterBoundary={state.adapterBoundary}
          catalogAdapter={{
            ...state.catalogAdapter,
            state: catalogResult.state,
            adapterOwner: catalogResult.adapterOwner,
            managerBacked: catalogResult.managerBacked,
            items: catalogResult.items.map(item => ({
              catalogId: item.catalogId || 'unknown-catalog-item',
              name: item.name || item.catalogId || 'unknown catalog item',
              risk: item.risk || 'unknown',
              status: item.status,
              executionMode: item.executionMode,
              adapterOwner: item.adapterOwner
            }))
          }}
          approvalDraft={{
            ...state.approvalDraft,
            status: approvalDraftStatus,
            onCreate: state.approvalDraft.state === 'ready' ? createApprovalDraft : undefined,
            result: approvalDraftResult,
            error: approvalDraftError
          }}
          approvalDraftQueue={{
            ...state.approvalDraftQueue,
            state: approvalDraftQueueResult.state,
            adapterOwner: approvalDraftQueueResult.adapterOwner,
            managerBacked: approvalDraftQueueResult.managerBacked,
            drafts: approvalDraftQueueResult.drafts.map(draft => ({
              draftId: draft.draftId,
              state: draft.state,
              actionId: draft.actionId,
              catalogId: draft.catalogId,
              executionState: draft.executionState,
              adapterOwner: draft.adapterOwner
            }))
          }}
          approvalDecision={{
            ...state.approvalDecision,
            state: approvalDraftResult?.draftId ? 'ready' : state.approvalDecision.state,
            status: approvalDecisionStatus,
            endpoint: approvalDecisionEndpoint,
            managerBacked: Boolean(approvalDecisionResult?.managerBacked),
            requestPreview: approvalDraftResult?.draftId
              ? JSON.stringify({
                draftId: approvalDraftResult.draftId,
                decision: 'approved',
                executionAllowed: false
              })
              : state.approvalDecision.requestPreview,
            onApprove: approvalDraftResult?.draftId ? () => void decideApprovalDraft('approved') : undefined,
            onReject: approvalDraftResult?.draftId ? () => void decideApprovalDraft('rejected') : undefined,
            result: approvalDecisionResult,
            error: approvalDecisionError
          }}
          checklistTitle={state.checklistTitle}
          checklist={state.checklist}
          suggestedActions={state.suggestedActions}
          suggestedTitle={t('actions.entry.suggested.title')}
          suggestedCopy={t('actions.entry.suggested.copy')}
          suggestedEvidenceLabel={t('actions.entry.suggested.evidence')}
          suggestedConfirmLabel={t('actions.entry.suggested.confirm')}
          emptyTitle={state.empty.title}
          emptyCopy={state.empty.copy}
        />
      </div>
    </main>
  );
}
