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
import { useCallback, useState } from 'react';

import {
  createNoticeTemplateDraft,
  isNoticeTemplateReadOnly,
  noticeTemplateDraftFromResource,
  validateNoticeTemplateDraft,
  type NoticeTemplateDraft,
  type NoticeTemplateQuery,
  type NoticeTemplateResourceRecord
} from '../notice-template-model';
import { noticeTemplateCreateActionUrl, noticeTemplateResourceName } from '../notice-template-resource';
import type { NoticeTemplateCommand } from './notice-template-command-state';
import { useNoticeTemplateRemove } from './use-notice-template-remove';

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
  const [draft, setDraft] = useState<NoticeTemplateDraft | null>(null);
  const [command, setCommand] = useState<NoticeTemplateCommand>('idle');
  const guardWritable = useCallback((template: NoticeTemplateResourceRecord) => {
    if (!isNoticeTemplateReadOnly(template)) return true;
    notification.open?.({ message: t('common.routeError.description'), type: 'error' });
    return false;
  }, [notification, t]);

  const create = useCallback(() => {
    if (command !== 'idle') return;
    setDraft(createNoticeTemplateDraft());
  }, [command]);
  const edit = useCallback(async (template: NoticeTemplateResourceRecord) => {
    if (command !== 'idle' || !guardWritable(template) || template.backendId == null || !provider.getOne) return;
    setCommand('loading-detail');
    try {
      const response = await provider.getOne<NoticeTemplateResourceRecord>({
        resource: noticeTemplateResourceName,
        id: template.backendId
      });
      if (isNoticeTemplateReadOnly(response.data)) throw new Error('Preset template cannot be edited');
      setDraft(noticeTemplateDraftFromResource(response.data));
    } catch {
      notification.open?.({ message: t('noticeTemplates.loadFailed'), type: 'error' });
    } finally {
      setCommand('idle');
    }
  }, [command, guardWritable, notification, provider, t]);
  const submit = useCallback(async () => {
    if (!draft || command !== 'idle') return;
    if (validateNoticeTemplateDraft(draft).length > 0) {
      notification.open?.({ message: t('noticeTemplates.validation'), type: 'error' });
      return;
    }
    setCommand('saving');
    try {
      if (draft.id === undefined) {
        if (!provider.custom) throw new Error('Notice Template create action is unavailable');
        const response = await provider.custom({
          url: noticeTemplateCreateActionUrl,
          method: 'post',
          payload: draft
        });
        if (response.data.acknowledged !== true) throw new Error('Notice Template create was not acknowledged');
      } else {
        if (!provider.update) throw new Error('Notice Template update action is unavailable');
        await provider.update<NoticeTemplateResourceRecord, NoticeTemplateDraft>({
          resource: noticeTemplateResourceName,
          id: draft.id,
          variables: draft
        });
      }
      await refreshAuthoritatively();
      setDraft(null);
      notification.open?.({ message: t('noticeTemplates.saveSuccess'), type: 'success' });
    } catch {
      notification.open?.({ message: t('noticeTemplates.saveFailed'), type: 'error' });
    } finally {
      setCommand('idle');
    }
  }, [command, draft, notification, provider, refreshAuthoritatively, t]);
  const remove = useNoticeTemplateRemove({
    command,
    guardWritable,
    notification,
    provider,
    query,
    refreshAuthoritatively,
    setCommand,
    t
  });

  return {
    closeDraft: () => command === 'idle' && setDraft(null),
    command,
    create,
    draft,
    edit,
    remove,
    submit,
    updateDraft: (patch: Partial<NoticeTemplateDraft>) => {
      setDraft(current => current ? { ...current, ...patch } : current);
    }
  };
}
