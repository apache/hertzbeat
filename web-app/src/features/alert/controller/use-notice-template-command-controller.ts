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

import { useNotification, type DataProvider } from '@refinedev/core';
import type { TFunction } from 'i18next';
import { useCallback } from 'react';

import {
  isNoticeTemplateReadOnly,
  type NoticeTemplateQuery,
  type NoticeTemplateResourceRecord
} from '../notice-template-model';
import { useNoticeTemplateEditorController } from './use-notice-template-editor-controller';
import { useNoticeTemplateOperationController } from './use-notice-template-operation-controller';
import { useNoticeTemplateRemove } from './use-notice-template-remove';
import { useNoticeTemplateSubmit } from './use-notice-template-submit';

export function useNoticeTemplateCommandController({
  notification,
  provider,
  query,
  refreshAuthoritatively,
  t
}: {
  notification: ReturnType<typeof useNotification>;
  provider: DataProvider;
  query: NoticeTemplateQuery;
  refreshAuthoritatively: () => Promise<void>;
  t: TFunction;
}) {
  const guardWritable = useCallback(
    (template: NoticeTemplateResourceRecord) => {
      if (!isNoticeTemplateReadOnly(template)) return true;
      notification.open?.({ message: t('common.routeError.description'), type: 'error' });
      return false;
    },
    [notification, t]
  );
  const notify = (message: string, type: 'error' | 'success') => notification.open?.({ message, type });
  const operation = useNoticeTemplateOperationController();
  const editor = useNoticeTemplateEditorController({
    guardWritable,
    notifyLoadFailure: () => notify(t('noticeTemplates.loadFailed'), 'error'),
    operation,
    provider
  });
  const submit = useNoticeTemplateSubmit({ editor, notify, operation, provider, refreshAuthoritatively, t });
  const remove = useNoticeTemplateRemove({
    guardWritable,
    notification,
    operation,
    provider,
    query,
    refreshAuthoritatively,
    t
  });

  return {
    closeDraft: () => {
      editor.actions.close();
    },
    command: operation.command,
    create: () => {
      editor.actions.create();
    },
    draft: editor.state.draft,
    edit: editor.actions.edit,
    remove,
    submit,
    updateDraft: editor.actions.update
  };
}
