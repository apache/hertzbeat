/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useTranslation } from 'react-i18next';

import { useBulletinDependencies } from './bulletin-dependencies-controller';
import { useBulletinEditorController, useBulletinOperationGate } from './bulletin-editor-controller';
import { useBulletinListController, useBulletinSelection } from './bulletin-list-controller';
import { useBulletinMetrics } from './bulletin-metrics-controller';
import { useBulletinQueryController } from './bulletin-query-controller';
import { useBulletinTransactions } from './bulletin-transactions-controller';

export function useBulletinController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const query = useBulletinQueryController();
  const list = useBulletinListController(query.query);
  const selection = useBulletinSelection(query.query, list.state);
  const gate = useBulletinOperationGate();
  const editor = useBulletinEditorController(gate, failure => {
    notification.open?.({ message: t(`bulletin.read.${failure}`), type: 'error' });
  });
  const dependencies = useBulletinDependencies(editor.state.draft);
  const metrics = useBulletinMetrics(selection.selectedId);
  const transactions = useBulletinTransactions({
    dependencies,
    editor,
    gate,
    refresh: list.refresh,
    selectedId: selection.selectedId,
    setSelectedId: selection.setSelectedId,
    t
  });

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
      selectedId: selection.selectedId
    },
    actions: {
      changePage: query.changePage,
      close: editor.actions.close,
      create: editor.actions.create,
      edit: editor.actions.edit,
      refresh: list.refresh,
      remove: transactions.remove,
      retry: transactions.retry,
      save: transactions.save,
      select: selection.setSelectedId,
      setSearch: query.setSearch,
      submitSearch: query.submitSearch,
      updateDraft: editor.actions.update
    }
  };
}
