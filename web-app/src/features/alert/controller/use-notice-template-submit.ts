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

import type { DataProvider } from '@refinedev/core';
import type { TFunction } from 'i18next';

import {
  validateNoticeTemplateDraft,
  type NoticeTemplateDraft,
  type NoticeTemplateResourceRecord
} from '../notice-template-model';
import { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from '../notice-template-resource';
import type { NoticeTemplateEditorController } from './use-notice-template-editor-controller';
import type { NoticeTemplateOperationController } from './use-notice-template-operation-controller';

export function useNoticeTemplateSubmit({
  editor,
  notify,
  operation,
  provider,
  refreshAuthoritatively,
  t
}: {
  editor: NoticeTemplateEditorController;
  notify: (message: string, type: 'error' | 'success') => void;
  operation: NoticeTemplateOperationController;
  provider: DataProvider;
  refreshAuthoritatively: () => Promise<void>;
  t: TFunction;
}) {
  return async () => {
    const draft = editor.controls.getDraft();
    if (!draft) return;
    if (validateNoticeTemplateDraft(draft).length > 0) {
      notify(t('noticeTemplates.validation'), 'error');
      return;
    }
    const owner = operation.beginCommand('saving');
    if (!owner) return;
    try {
      await save(provider, draft);
      if (!operation.isCurrent(owner)) return;
      await refreshAuthoritatively();
      if (!operation.isCurrent(owner)) return;
      editor.controls.publish(null);
      notify(t('noticeTemplates.saveSuccess'), 'success');
    } catch {
      if (operation.isCurrent(owner)) notify(t('noticeTemplates.saveFailed'), 'error');
    } finally {
      operation.end(owner);
    }
  };
}

async function save(provider: DataProvider, draft: NoticeTemplateDraft) {
  if (draft.id === undefined) {
    if (!provider.custom) throw new Error('Notice Template create action is unavailable');
    const response = await provider.custom({
      url: noticeTemplateCreateActionUrl,
      method: 'post',
      payload: draft
    });
    if (response.data.acknowledged !== true) throw new Error('Notice Template create was not acknowledged');
    return;
  }
  if (!provider.update) throw new Error('Notice Template update action is unavailable');
  await provider.update<NoticeTemplateResourceRecord, NoticeTemplateDraft>({
    resource: noticeTemplateResourceName,
    id: draft.id,
    variables: draft
  });
}
