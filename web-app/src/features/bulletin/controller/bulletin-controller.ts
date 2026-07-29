/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';

import { bulletinActionCapabilities } from '../model/bulletin-action-capability';
import { applyBulletinCapabilityLoss } from './bulletin-access-retirement';
import { useBulletinDependencies } from './bulletin-dependencies-controller';
import { useBulletinEditorController } from './bulletin-editor-controller';
import { useBulletinBatchSelection, useBulletinListController, useBulletinSelection } from './bulletin-list-controller';
import { useBulletinMetrics } from './bulletin-metrics-controller';
import { useBulletinOperationGate } from './bulletin-operation-gate';
import { useBulletinPageCorrection } from './bulletin-page-correction-controller';
import { useBulletinQueryController } from './bulletin-query-controller';
import { useBulletinTransactions } from './bulletin-transactions-controller';

export function useBulletinController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const { capabilities, capabilityRefs } = useBulletinCapabilities();
  const { batchSelection, list, query, selection } = useBulletinListWorkspace(capabilities.canRead);
  const gate = useBulletinOperationGate();
  const editor = useBulletinEditorController(
    gate,
    failure => {
      notification.open?.({ message: t(`bulletin.read.${failure}`), type: 'error' });
    },
    capabilityRefs.canWriteRef
  );
  const dependencies = useBulletinDependencies(editor.state.draft, capabilities.canRead);
  const metrics = useBulletinMetrics(selection.selectedId, capabilities.canRead);
  const transactions = useBulletinTransactions({
    canDeleteRef: capabilityRefs.canDeleteRef,
    canWriteRef: capabilityRefs.canWriteRef,
    dependencies,
    editor,
    gate,
    refresh: list.refresh,
    selectedId: selection.selectedId,
    setSelectedId: selection.setSelectedId,
    t
  });
  useBulletinCapabilityRetirement(capabilities, editor, gate, batchSelection.selectIds);
  const actions = createBulletinActions({ batchSelection, editor, gate, list, query, selection, transactions });

  return {
    state: {
      capabilities,
      command: gate.command,
      dependencies,
      draft: editor.state.draft,
      list: list.state,
      metrics,
      notice: gate.notice,
      query: query.query,
      recovery: gate.recovery,
      refreshing: list.refreshing,
      search: query.search,
      selectedId: selection.selectedId,
      selectedIds: batchSelection.selectedIds
    },
    actions
  };
}

type BulletinActionSources = {
  batchSelection: ReturnType<typeof useBulletinBatchSelection>;
  editor: ReturnType<typeof useBulletinEditorController>;
  gate: ReturnType<typeof useBulletinOperationGate>;
  list: ReturnType<typeof useBulletinListController>;
  query: ReturnType<typeof useBulletinQueryController>;
  selection: ReturnType<typeof useBulletinSelection>;
  transactions: ReturnType<typeof useBulletinTransactions>;
};

function createBulletinActions(source: BulletinActionSources) {
  const admitRead =
    <Args extends unknown[]>(action: (...args: Args) => unknown) =>
    (...args: Args) => {
      if (source.gate.isCommandActive()) return false;
      action(...args);
      return true;
    };
  const admitReadAsync = (action: () => Promise<boolean>) => async () =>
    source.gate.isCommandActive() ? false : action();
  const admitBatchSelection = (ids: number[]) => {
    if (source.gate.isLocked()) return false;
    source.batchSelection.selectIds(ids);
    return true;
  };
  return {
    changePage: admitRead(source.query.changePage),
    close: source.editor.actions.close,
    create: source.editor.actions.create,
    dismissNotice: source.gate.dismissNotice,
    edit: source.editor.actions.edit,
    refresh: admitReadAsync(source.list.refresh),
    remove: source.transactions.remove,
    removeMany: source.transactions.removeMany,
    retry: source.transactions.retry,
    save: source.transactions.save,
    select: admitRead(source.selection.setSelectedId),
    selectIds: admitBatchSelection,
    setSearch: admitRead(source.query.setSearch),
    stopVerification: source.gate.cancelRecovery,
    submitSearch: admitRead(source.query.submitSearch),
    updateDraft: source.editor.actions.update
  };
}

function useBulletinCapabilities() {
  const capabilities = bulletinActionCapabilities(useSession().session?.roles ?? []);
  return { capabilities, capabilityRefs: useCurrentBulletinCapabilities(capabilities) };
}

function useBulletinListWorkspace(canRead: boolean) {
  const query = useBulletinQueryController();
  const list = useBulletinListController(query.query, canRead);
  useBulletinPageCorrection(query.query, list.page, query.replacePageIndex);
  const selection = useBulletinSelection(query.query, list.state);
  const batchSelection = useBulletinBatchSelection(query.query, list.state);
  return { batchSelection, list, query, selection };
}

function useCurrentBulletinCapabilities(capabilities: ReturnType<typeof bulletinActionCapabilities>) {
  const canWriteRef = useRef(capabilities.canWrite);
  const canDeleteRef = useRef(capabilities.canDelete);
  useLayoutEffect(() => {
    canWriteRef.current = capabilities.canWrite;
    canDeleteRef.current = capabilities.canDelete;
  }, [capabilities.canDelete, capabilities.canWrite]);
  return { canDeleteRef, canWriteRef };
}

function useBulletinCapabilityRetirement(
  capabilities: ReturnType<typeof bulletinActionCapabilities>,
  editor: ReturnType<typeof useBulletinEditorController>,
  gate: ReturnType<typeof useBulletinOperationGate>,
  selectIds: (ids: number[]) => void
) {
  const previous = useRef(capabilities);
  useLayoutEffect(() => {
    const prior = previous.current;
    previous.current = capabilities;
    applyBulletinCapabilityLoss(prior, capabilities, {
      clearDeleteBatchSelection: () => selectIds([]),
      retireDelete: () => gate.retire('delete'),
      retireSave: () => gate.retire('save'),
      retireWriteDraft: editor.controls.retireWriteAccess
    });
  }, [capabilities, editor.controls, gate, selectIds]);
}
