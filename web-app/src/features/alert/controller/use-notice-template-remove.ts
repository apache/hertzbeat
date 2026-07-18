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

import type {
  NoticeTemplateQuery,
  NoticeTemplateResourceRecord
} from '../notice-template-model';
import { noticeTemplateResourceName } from '../notice-template-resource';
import type { NoticeTemplateCommand } from './notice-template-command-state';

export function useNoticeTemplateRemove({
  command,
  guardWritable,
  notification,
  provider,
  query,
  refreshAuthoritatively,
  setCommand,
  t
}: {
  command: NoticeTemplateCommand;
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean;
  notification: ReturnType<typeof useNotification>;
  provider: DataProvider;
  query: NoticeTemplateQuery;
  refreshAuthoritatively: () => Promise<void>;
  setCommand: (command: NoticeTemplateCommand) => void;
  t: TFunction;
}) {
  return useCallback(async (template: NoticeTemplateResourceRecord) => {
    if (command !== 'idle' || !guardWritable(template) || template.backendId == null || !provider.deleteOne) return;
    setCommand('deleting');
    try {
      await provider.deleteOne<
        NoticeTemplateResourceRecord,
        { record: NoticeTemplateResourceRecord; query: NoticeTemplateQuery }
      >({
        resource: noticeTemplateResourceName,
        id: template.backendId,
        variables: { record: template, query }
      });
      await refreshAuthoritatively();
      notification.open?.({ message: t('noticeTemplates.deleteSuccess'), type: 'success' });
    } catch {
      notification.open?.({ message: t('noticeTemplates.deleteFailed'), type: 'error' });
    } finally {
      setCommand('idle');
    }
  }, [command, guardWritable, notification, provider, query, refreshAuthoritatively, setCommand, t]);
}
