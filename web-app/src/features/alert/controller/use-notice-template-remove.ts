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
import { useRef } from 'react';

import {
  isNoticeTemplateReadOnly,
  type NoticeTemplateQuery,
  type NoticeTemplateResourceRecord
} from '../notice-template-model';
import { noticeTemplateResourceName } from '../api/notice-template-resource';
import type { NoticeTemplateOperationController } from './use-notice-template-operation-controller';
import { preflightNoticeTemplateDeletion, proveNoticeTemplateDeletion } from './notice-template-write-proof';
import { isDefiniteWriteRejection } from './notice-template-write-rejection';
import type { NoticeTemplateActionCapabilities } from '../model/notice-template-action-capability';
import { canDeleteNoticeTemplate } from './notice-template-action-admission';

export function useNoticeTemplateRemove({
  guardWritable,
  capabilities,
  notification,
  provider,
  query,
  refreshAuthoritatively,
  operation,
  t
}: {
  capabilities: NoticeTemplateActionCapabilities;
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean;
  notification: ReturnType<typeof useNotification>;
  provider: DataProvider;
  query: NoticeTemplateQuery;
  refreshAuthoritatively: () => Promise<void>;
  operation: NoticeTemplateOperationController;
  t: TFunction;
}) {
  const confirmedDeletedIds = useRef(new Set<number>());
  return async (template: NoticeTemplateResourceRecord) => {
    if (!canDeleteNoticeTemplate(capabilities, template)) {
      if (isNoticeTemplateReadOnly(template)) guardWritable(template);
      return;
    }
    const action = prepareDelete(guardWritable, provider, template);
    if (!action || confirmedDeletedIds.current.has(action.id)) return;
    const owner = operation.beginCommand('deleting');
    if (!owner) return;
    try {
      const confirmed = await deleteAndProve({
        action,
        confirmedDeletedIds: confirmedDeletedIds.current,
        operation,
        owner,
        provider,
        query,
        template
      });
      if (!confirmed) return;
      notification.open?.({ message: t('noticeTemplates.deleteSuccess'), type: 'success' });
      try {
        await refreshAuthoritatively();
      } catch {
        operation.setRecovery(owner, { stage: 'projection', action: 'delete' });
      }
    } catch {
      if (operation.isCurrent(owner)) {
        notification.open?.({ message: t('noticeTemplates.deleteFailed'), type: 'error' });
      }
    } finally {
      operation.end(owner);
    }
  };
}

async function deleteAndProve(options: {
  action: NonNullable<ReturnType<typeof prepareDelete>>;
  confirmedDeletedIds: Set<number>;
  operation: NoticeTemplateOperationController;
  owner: Parameters<NoticeTemplateOperationController['isCurrent']>[0];
  provider: DataProvider;
  query: NoticeTemplateQuery;
  template: NoticeTemplateResourceRecord;
}) {
  await preflightNoticeTemplateDeletion(options.provider, options.template);
  if (!options.operation.isCurrent(options.owner)) return false;
  options.operation.setRecovery(options.owner, {
    stage: 'delete-proof',
    id: options.action.id,
    record: options.template
  });
  try {
    await options.action.deleteOne<
      NoticeTemplateResourceRecord,
      { record: NoticeTemplateResourceRecord; query: NoticeTemplateQuery }
    >({
      resource: noticeTemplateResourceName,
      id: options.action.id,
      variables: { record: options.template, query: options.query }
    });
  } catch (reason) {
    if (isDefiniteWriteRejection(reason)) {
      options.operation.clearRecovery(options.owner);
      throw reason;
    }
  }
  if (!options.operation.isCurrent(options.owner)) return false;
  options.confirmedDeletedIds.add(options.action.id);
  await proveNoticeTemplateDeletion(options.provider, options.action.id);
  if (!options.operation.isCurrent(options.owner)) return false;
  options.operation.clearRecovery(options.owner);
  return true;
}

function prepareDelete(
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean,
  provider: DataProvider,
  template: NoticeTemplateResourceRecord
) {
  if (!guardWritable(template) || template.backendId == null || !provider.deleteOne) return null;
  return { deleteOne: provider.deleteOne, id: template.backendId };
}
