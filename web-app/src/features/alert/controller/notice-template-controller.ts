/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useDataProvider, useNotification } from '@refinedev/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NoticeTemplateResourceRecord } from '../notice-template-model';
import { noticeTemplateResourceName } from '../api/notice-template-resource';
import { useNoticeTemplateCommandController } from './use-notice-template-command-controller';
import { useNoticeTemplateListController } from './use-notice-template-list-controller';
import { useNoticeTemplatePageCorrection } from './use-notice-template-page-correction';
import { useNoticeTemplateQueryController } from './use-notice-template-query-controller';

/** Composes URL, read, and command owners into the page-facing controller. */
export function useNoticeTemplateController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const resolveDataProvider = useDataProvider();
  const provider = resolveDataProvider(noticeTemplateResourceName);
  const queryController = useNoticeTemplateQueryController();
  const listController = useNoticeTemplateListController(queryController.query);
  useNoticeTemplatePageCorrection(queryController.query, listController.listState, queryController.replacePageIndex);
  const [preview, setPreview] = useState<NoticeTemplateResourceRecord | null>(null);
  const commands = useNoticeTemplateCommandController({
    notification,
    provider,
    query: queryController.query,
    refreshAuthoritatively: listController.refreshAuthoritatively,
    t
  });

  return {
    changePage: queryController.changePage,
    changePreset: queryController.changePreset,
    closeDraft: commands.closeDraft,
    closePreview: () => setPreview(null),
    create: commands.create,
    edit: commands.edit,
    query: queryController.submitQuery,
    refresh: listController.refresh,
    remove: commands.remove,
    retryRecovery: commands.retryRecovery,
    setName: queryController.setName,
    setPreview,
    state: {
      command: commands.command,
      draft: commands.draft,
      list: listController.listState,
      name: queryController.name,
      preview,
      query: queryController.query,
      recovery: commands.recovery,
      refreshing: listController.refreshing
    },
    submit: commands.submit,
    updateDraft: commands.updateDraft
  };
}
