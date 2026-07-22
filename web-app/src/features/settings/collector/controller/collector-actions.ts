/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { CollectorPageSize, CollectorQuery } from '../model/collector-query-model';
import type { useCollectorIntakeController } from './use-collector-intake-controller';
import type { useCollectorMutationController } from './use-collector-mutation-controller';
import type { useCollectorRuntimeConfigController } from './use-collector-runtime-config-controller';

type ActionOptions = {
  nameDraft: string;
  queryRef: { current: CollectorQuery };
  selected: string[];
  visibleMutableNames: string[];
  setNameDraft: (name: string) => void;
  setSelected: (selected: string[]) => void;
  navigateQuery: (next: CollectorQuery, replace?: boolean) => void;
  mutation: ReturnType<typeof useCollectorMutationController>;
  intake: ReturnType<typeof useCollectorIntakeController>;
  runtime: ReturnType<typeof useCollectorRuntimeConfigController>;
  refetch: () => unknown;
};

export function buildCollectorActions(options: ActionOptions) {
  const managedBusy = () => options.intake.saving || options.runtime.busy;
  return {
    setNameDraft: options.setNameDraft,
    submitName: () => {
      const name = options.nameDraft.trim();
      const current = options.queryRef.current;
      options.navigateQuery({ ...current, name, pageIndex: name === current.name ? current.pageIndex : 0 });
    },
    setPage: (pageIndex: number, pageSize: CollectorPageSize) =>
      options.navigateQuery({ ...options.queryRef.current, pageIndex, pageSize }),
    refresh: () => {
      if (!managedBusy()) options.mutation.refresh(options.refetch);
    },
    requestAction: (action: Parameters<typeof options.mutation.requestAction>[0], collectors: string[]) => {
      if (!managedBusy()) options.mutation.requestAction(action, collectors);
    },
    cancelAction: options.mutation.cancelAction,
    confirmAction: options.mutation.confirmAction,
    openIntake: options.intake.open,
    saveIntake: options.intake.save,
    clearIntake: options.intake.clear,
    cancelIntake: options.intake.cancel,
    openRuntimeConfig: options.runtime.open,
    saveRuntimeConfig: options.runtime.save,
    cancelRuntimeConfig: options.runtime.cancel,
    toggleSelection: (name: string, checked: boolean) => {
      if (options.mutation.mutating || managedBusy() || !options.visibleMutableNames.includes(name)) return;
      options.setSelected(
        checked ? [...new Set([...options.selected, name])] : options.selected.filter(candidate => candidate !== name)
      );
    },
    toggleAll: (checked: boolean) => {
      if (!options.mutation.mutating && !managedBusy()) {
        options.setSelected(checked ? options.visibleMutableNames : []);
      }
    }
  };
}
