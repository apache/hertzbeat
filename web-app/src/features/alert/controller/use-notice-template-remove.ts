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

import type { NoticeTemplateQuery, NoticeTemplateResourceRecord } from '../notice-template-model';
import { noticeTemplateResourceName } from '../notice-template-resource';
import type { NoticeTemplateOperationController } from './use-notice-template-operation-controller';

export function useNoticeTemplateRemove({
  guardWritable,
  notification,
  provider,
  query,
  refreshAuthoritatively,
  operation,
  t
}: {
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean;
  notification: ReturnType<typeof useNotification>;
  provider: DataProvider;
  query: NoticeTemplateQuery;
  refreshAuthoritatively: () => Promise<void>;
  operation: NoticeTemplateOperationController;
  t: TFunction;
}) {
  return async (template: NoticeTemplateResourceRecord) => {
    if (!guardWritable(template) || template.backendId == null || !provider.deleteOne) return;
    const owner = operation.beginCommand('deleting');
    if (!owner) return;
    try {
      await provider.deleteOne<
        NoticeTemplateResourceRecord,
        { record: NoticeTemplateResourceRecord; query: NoticeTemplateQuery }
      >({
        resource: noticeTemplateResourceName,
        id: template.backendId,
        variables: { record: template, query }
      });
      if (!operation.isCurrent(owner)) return;
      await refreshAuthoritatively();
      if (!operation.isCurrent(owner)) return;
      notification.open?.({ message: t('noticeTemplates.deleteSuccess'), type: 'success' });
    } catch {
      if (operation.isCurrent(owner)) {
        notification.open?.({ message: t('noticeTemplates.deleteFailed'), type: 'error' });
      }
    } finally {
      operation.end(owner);
    }
  };
}
