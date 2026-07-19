/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useNotification } from '@refinedev/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBulletinDependencies } from './bulletin-dependencies-controller';
import { useBulletinEditorController, useBulletinOperationGate } from './bulletin-editor-controller';
import { useBulletinListController, useBulletinSelectionConvergence } from './bulletin-list-controller';
import { useBulletinMetrics } from './bulletin-metrics-controller';
import { useBulletinQueryController } from './bulletin-query-controller';
import { useBulletinTransactions } from './bulletin-transactions-controller';

export function useBulletinController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const query = useBulletinQueryController();
  const list = useBulletinListController(query.query);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const gate = useBulletinOperationGate();
  const editor = useBulletinEditorController(gate, failure => {
    notification.open?.({ message: t(`bulletin.read.${failure}`), type: 'error' });
  });
  const dependencies = useBulletinDependencies(editor.state.draft);
  const activeSelectedId = useBulletinSelectionConvergence(selectedId, list.state, setSelectedId);
  const metrics = useBulletinMetrics(activeSelectedId);
  const transactions = useBulletinTransactions({
    dependencies,
    editor,
    gate,
    refresh: list.refresh,
    selectedId,
    setSelectedId,
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
      refreshing: list.refreshing,
      search: query.search,
      selectedId: activeSelectedId
    },
    actions: {
      changePage: query.changePage,
      close: editor.actions.close,
      create: editor.actions.create,
      edit: editor.actions.edit,
      refresh: list.refresh,
      remove: transactions.remove,
      save: transactions.save,
      select: setSelectedId,
      setSearch: query.setSearch,
      submitSearch: query.submitSearch,
      updateDraft: editor.actions.update
    }
  };
}
