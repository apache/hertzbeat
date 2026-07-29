/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { CollectorPageSize, CollectorQuery } from '../model/collector-query-model';
import type { CollectorActionCapabilities } from '../model/collector-action-capability';
import type { useCollectorIntakeController } from './use-collector-intake-controller';
import type { useCollectorFileLogSourceController } from './use-collector-file-log-source-controller';
import type { useCollectorMutationController } from './use-collector-mutation-controller';
import type { useCollectorPrometheusSourceController } from './use-collector-prometheus-source-controller';
import type { useCollectorRuntimeConfigController } from './use-collector-runtime-config-controller';

type ActionOptions = {
  capabilities: CollectorActionCapabilities;
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
  prometheus: ReturnType<typeof useCollectorPrometheusSourceController>;
  fileLog: ReturnType<typeof useCollectorFileLogSourceController>;
  refetch: () => unknown;
};

export function buildCollectorActions(options: ActionOptions) {
  return {
    setNameDraft: options.setNameDraft,
    ...buildCollectorListActions(options),
    ...buildCollectorEditorActions(options),
    ...buildCollectorSelectionActions(options)
  };
}

function buildCollectorListActions(options: ActionOptions) {
  return {
    submitName: () => {
      const name = options.nameDraft.trim();
      const current = options.queryRef.current;
      options.navigateQuery({ ...current, name, pageIndex: name === current.name ? current.pageIndex : 0 });
    },
    setPage: (pageIndex: number, pageSize: CollectorPageSize) =>
      options.navigateQuery({ ...options.queryRef.current, pageIndex, pageSize }),
    refresh: () => {
      if (!managedCollectorEditorBusy(options)) options.mutation.refresh(options.refetch);
    },
    requestAction: (action: Parameters<typeof options.mutation.requestAction>[0], collectors: string[]) => {
      if (!managedCollectorEditorBusy(options) && actionAllowed(action, options.capabilities)) {
        options.mutation.requestAction(action, collectors);
      }
    },
    cancelAction: options.mutation.cancelAction,
    confirmAction: () => {
      const action = options.mutation.pendingAction?.action;
      return action && actionAllowed(action, options.capabilities)
        ? options.mutation.confirmAction()
        : Promise.resolve();
    }
  };
}

function buildCollectorEditorActions(options: ActionOptions) {
  return {
    openIntake: (name: string) => {
      if (options.capabilities.canWrite) options.intake.open(name);
    },
    saveIntake: (value: unknown) => (options.capabilities.canWrite ? options.intake.save(value) : Promise.resolve()),
    clearIntake: () => (options.capabilities.canDelete ? options.intake.clear() : Promise.resolve()),
    cancelIntake: options.intake.cancel,
    openRuntimeConfig: (name: string) =>
      options.capabilities.canWrite ? options.runtime.open(name) : Promise.resolve(),
    saveRuntimeConfig: (value: unknown) =>
      options.capabilities.canWrite ? options.runtime.save(value) : Promise.resolve(),
    cancelRuntimeConfig: options.runtime.cancel,
    openPrometheusSources: () => {
      if (options.capabilities.canWrite) options.prometheus.open();
    },
    selectPrometheusTarget: options.prometheus.select,
    applyPrometheusTarget: options.prometheus.apply,
    removePrometheusTarget: options.prometheus.remove,
    savePrometheusSources: () => (options.capabilities.canWrite ? options.prometheus.save() : Promise.resolve()),
    cancelPrometheusSources: options.prometheus.cancel,
    closePrometheusSources: options.prometheus.close,
    cancelPrometheusTarget: options.prometheus.cancelTarget,
    openFileLogSources: () => {
      if (options.capabilities.canWrite) options.fileLog.open();
    },
    selectFileLogSource: options.fileLog.select,
    applyFileLogSource: options.fileLog.apply,
    removeFileLogSource: options.fileLog.remove,
    saveFileLogSources: () => (options.capabilities.canWrite ? options.fileLog.save() : Promise.resolve()),
    cancelFileLogSources: options.fileLog.cancel,
    closeFileLogSources: options.fileLog.close,
    cancelFileLogSource: options.fileLog.cancelSource
  };
}

function buildCollectorSelectionActions(options: ActionOptions) {
  return {
    toggleSelection: (name: string, checked: boolean) => {
      if (
        (!options.capabilities.canWrite && !options.capabilities.canDelete) ||
        options.mutation.mutating ||
        managedCollectorEditorBusy(options) ||
        !options.visibleMutableNames.includes(name)
      )
        return;
      options.setSelected(
        checked ? [...new Set([...options.selected, name])] : options.selected.filter(candidate => candidate !== name)
      );
    },
    toggleAll: (checked: boolean) => {
      if (
        (options.capabilities.canWrite || options.capabilities.canDelete) &&
        !options.mutation.mutating &&
        !managedCollectorEditorBusy(options)
      ) {
        options.setSelected(checked ? options.visibleMutableNames : []);
      }
    }
  };
}

function managedCollectorEditorBusy(options: ActionOptions) {
  return options.intake.saving || options.runtime.busy || options.prometheus.saving || options.fileLog.saving;
}

function actionAllowed(
  action: Parameters<ActionOptions['mutation']['requestAction']>[0],
  capabilities: CollectorActionCapabilities
) {
  return action === 'delete' ? capabilities.canDelete : capabilities.canWrite;
}
