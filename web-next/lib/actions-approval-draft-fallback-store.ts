export type FallbackApprovalDraftRecord = {
  draftId: string;
  state: string;
  executionState: string;
  executionAllowed: false;
  adapterOwner: 'next-actions-approval-draft-bff' | 'next-actions-approval-decision-bff';
  managerBacked: false;
  actionId?: string;
  catalogId?: string;
  decision?: string;
  reviewer?: string;
  reason?: string;
  gmtUpdate: string;
};

type ApprovalDraftFallbackStoreGlobal = typeof globalThis & {
  __hertzbeatActionsApprovalDraftFallbackStore?: Map<string, FallbackApprovalDraftRecord>;
};

const fallbackStoreGlobal = globalThis as ApprovalDraftFallbackStoreGlobal;
const fallbackApprovalDrafts = fallbackStoreGlobal.__hertzbeatActionsApprovalDraftFallbackStore
  ?? new Map<string, FallbackApprovalDraftRecord>();

fallbackStoreGlobal.__hertzbeatActionsApprovalDraftFallbackStore = fallbackApprovalDrafts;

export function saveFallbackApprovalDraft(
  draft: Omit<FallbackApprovalDraftRecord, 'gmtUpdate'>
): FallbackApprovalDraftRecord {
  const record = {
    ...draft,
    gmtUpdate: new Date().toISOString()
  };
  fallbackApprovalDrafts.set(record.draftId, record);
  return record;
}

export function listFallbackApprovalDrafts(limit = 8): FallbackApprovalDraftRecord[] {
  return Array.from(fallbackApprovalDrafts.values())
    .sort((left, right) => right.gmtUpdate.localeCompare(left.gmtUpdate))
    .slice(0, limit);
}

export function decideFallbackApprovalDraft(
  draftId: string,
  decision: string,
  reviewer: string,
  reason: string
): FallbackApprovalDraftRecord {
  const existing = fallbackApprovalDrafts.get(draftId);
  return saveFallbackApprovalDraft({
    ...(existing || {
      draftId,
      actionId: undefined,
      catalogId: undefined
    }),
    draftId,
    decision,
    reviewer,
    reason,
    state: decision === 'approved' ? 'approval-draft-approved' : 'approval-draft-rejected',
    executionState: 'not-executed',
    executionAllowed: false,
    adapterOwner: 'next-actions-approval-decision-bff',
    managerBacked: false
  });
}

export function resetFallbackApprovalDraftsForTest() {
  fallbackApprovalDrafts.clear();
}
