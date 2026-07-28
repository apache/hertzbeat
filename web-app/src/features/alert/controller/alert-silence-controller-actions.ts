/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import type { AlertSilenceDraft, AlertSilenceQuery } from '../model/alert-silence-model';
import type { useAlertSilenceDetailController } from './use-alert-silence-detail-controller';
import type { useAlertSilenceMutations } from './use-alert-silence-mutations';

type ManagementActions = {
  viewAllRules: () => void;
  viewMatchedRules: () => void;
  returnToEntity: () => void;
};

export function createAlertSilenceControllerActions(options: {
  capabilities: AlertActionCapabilities;
  search: string;
  draft: AlertSilenceDraft | null;
  detail: ReturnType<typeof useAlertSilenceDetailController>;
  mutations: ReturnType<typeof useAlertSilenceMutations>;
  setSearch: (value: string) => void;
  updateQuery: (patch: Partial<AlertSilenceQuery>) => void;
  refresh: () => void;
  selectIds: (ids: number[]) => void;
  managementActions: ManagementActions;
}) {
  const { capabilities, detail, draft, mutations } = options;
  return {
    setSearch: options.setSearch,
    submitSearch: () => options.updateQuery({ search: options.search.trim(), pageIndex: 0 }),
    changePage: (page: number, pageSize: number) => options.updateQuery({ pageIndex: page - 1, pageSize }),
    refresh: options.refresh,
    selectIds: options.selectIds,
    create: () => {
      if (capabilities.canWrite) detail.create();
    },
    edit: (id: number) => (capabilities.canWrite ? detail.edit(id) : Promise.resolve()),
    cancel: detail.cancel,
    updateDraft: (patch: Partial<AlertSilenceDraft>) => {
      if (capabilities.canWrite) detail.updateDraft(patch);
    },
    replaceDraft: (nextDraft: AlertSilenceDraft) => {
      if (capabilities.canWrite) detail.replaceDraft(nextDraft);
    },
    save: () =>
      capabilities.canWrite ? mutations.save(draft, detail.captureCloseCurrentSession()) : Promise.resolve(),
    toggle: (...args: Parameters<typeof mutations.toggle>) =>
      capabilities.canWrite ? mutations.toggle(...args) : Promise.resolve(),
    remove: (id: number) => (capabilities.canDelete ? mutations.remove(id) : Promise.resolve()),
    removeMany: (ids: readonly number[]) => (capabilities.canDelete ? mutations.removeMany(ids) : Promise.resolve()),
    ...options.managementActions
  };
}
