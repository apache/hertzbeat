/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';

import { bulletinActionCapabilities } from '../model/bulletin-action-capability';
import { applyBulletinCapabilityLoss } from './bulletin-access-retirement';
import { useBulletinDependencies } from './bulletin-dependencies-controller';
import { useBulletinEditorController, useBulletinOperationGate } from './bulletin-editor-controller';
import { useBulletinBatchSelection, useBulletinListController, useBulletinSelection } from './bulletin-list-controller';
import { useBulletinMetrics } from './bulletin-metrics-controller';
import { useBulletinQueryController } from './bulletin-query-controller';
import { useBulletinTransactions } from './bulletin-transactions-controller';

export function useBulletinController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const capabilities = bulletinActionCapabilities(useSession().session?.roles ?? []);
  const capabilityRefs = useCurrentBulletinCapabilities(capabilities);
  const query = useBulletinQueryController();
  const list = useBulletinListController(query.query, capabilities.canRead);
  const selection = useBulletinSelection(query.query, list.state);
  const batchSelection = useBulletinBatchSelection(query.query, list.state);
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

  return {
    state: {
      command: gate.command,
      dependencies,
      draft: editor.state.draft,
      list: list.state,
      metrics,
      query: query.query,
      recovery: gate.recovery,
      refreshing: list.refreshing,
      search: query.search,
      selectedId: selection.selectedId,
      selectedIds: batchSelection.selectedIds
    },
    actions: {
      changePage: query.changePage,
      close: editor.actions.close,
      create: editor.actions.create,
      edit: editor.actions.edit,
      refresh: list.refresh,
      remove: transactions.remove,
      removeMany: transactions.removeMany,
      retry: transactions.retry,
      save: transactions.save,
      select: selection.setSelectedId,
      selectIds: batchSelection.selectIds,
      setSearch: query.setSearch,
      submitSearch: query.submitSearch,
      updateDraft: editor.actions.update
    }
  };
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
