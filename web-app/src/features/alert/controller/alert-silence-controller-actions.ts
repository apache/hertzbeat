/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import { zeroBasedPageChange } from '@/shared/query-context';
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
  query: AlertSilenceQuery;
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
    submitSearch: () => {
      const search = options.search.trim();
      options.setSearch(search);
      options.updateQuery({ search, pageIndex: 0 });
    },
    changePage: (page: number, pageSize: number) =>
      options.updateQuery(zeroBasedPageChange(page, pageSize, options.query.pageSize)),
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
