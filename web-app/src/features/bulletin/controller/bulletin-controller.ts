/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { createBulletinDraft, type BulletinDraft } from '../model/bulletin-model';
import { useBulletinDependencies } from './bulletin-dependencies-controller';
import {
  useBulletinListController,
  useBulletinSelectionConvergence
} from './bulletin-list-controller';
import { useBulletinMetrics } from './bulletin-metrics-controller';
import { useBulletinQueryController } from './bulletin-query-controller';
import {
  useBulletinTransactions,
  type BulletinCommand
} from './bulletin-transactions-controller';

export function useBulletinController() {
  const { t } = useTranslation();
  const query = useBulletinQueryController();
  const list = useBulletinListController(query.query);
  const [draft, setDraft] = useState<BulletinDraft | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [command, setCommand] = useState<BulletinCommand>('idle');
  const dependencies = useBulletinDependencies(draft);
  const activeSelectedId = useBulletinSelectionConvergence(
    selectedId,
    list.state,
    setSelectedId
  );
  const metrics = useBulletinMetrics(activeSelectedId);
  const transactions = useBulletinTransactions({
    command,
    dependencies,
    draft,
    refresh: list.refresh,
    selectedId,
    setCommand,
    setDraft,
    setSelectedId,
    t
  });
  const draftActions = createDraftActions(command, setDraft);

  return {
    state: {
      command,
      dependencies,
      draft,
      list: list.state,
      metrics,
      query: query.query,
      refreshing: list.refreshing,
      search: query.search,
      selectedId: activeSelectedId
    },
    actions: {
      changePage: query.changePage,
      close: draftActions.close,
      create: draftActions.create,
      edit: transactions.edit,
      refresh: list.refresh,
      remove: transactions.remove,
      save: transactions.save,
      select: setSelectedId,
      setSearch: query.setSearch,
      submitSearch: query.submitSearch,
      updateDraft: draftActions.update
    }
  };
}

function createDraftActions(
  command: BulletinCommand,
  setDraft: Dispatch<SetStateAction<BulletinDraft | null>>
) {
  return {
    close: () => {
      if (command === 'idle') setDraft(null);
    },
    create: () => {
      if (command === 'idle') setDraft(createBulletinDraft());
    },
    update: (patch: Partial<BulletinDraft>) => {
      setDraft(current => current ? { ...current, ...patch } : null);
    }
  };
}
