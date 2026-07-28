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
import { useRef, useState } from 'react';

import {
  createNoticeTemplateDraft,
  isNoticeTemplateReadOnly,
  noticeTemplateDraftFromResource,
  type NoticeTemplateDraft,
  type NoticeTemplateResourceRecord
} from '../notice-template-model';
import { noticeTemplateResourceName } from '../api/notice-template-resource';
import type { NoticeTemplateOperationController } from './use-notice-template-operation-controller';
import type { NoticeTemplateActionCapabilities } from '../model/notice-template-action-capability';
import { canEditNoticeTemplate } from './notice-template-action-admission';

export function useNoticeTemplateEditorController({
  guardWritable,
  capabilities,
  notifyLoadFailure,
  operation,
  provider
}: {
  capabilities: NoticeTemplateActionCapabilities;
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean;
  notifyLoadFailure: () => void;
  operation: NoticeTemplateOperationController;
  provider: DataProvider;
}) {
  const draftStore = useNoticeTemplateDraftStore();
  const detailEditor = useNoticeTemplateDetailEditor({
    draftStore,
    capabilities,
    guardWritable,
    notifyLoadFailure,
    operation,
    provider
  });
  return {
    actions: {
      close: () => {
        if (!detailEditor.retire()) return false;
        draftStore.publish(null);
        return true;
      },
      create: () => {
        if (!capabilities.canCreate) return false;
        if (!detailEditor.retire()) return false;
        draftStore.publish(createNoticeTemplateDraft());
        return true;
      },
      edit: detailEditor.edit,
      update: (patch: Partial<NoticeTemplateDraft>) => {
        const current = draftStore.get();
        if (!current || operation.isLocked()) return false;
        draftStore.publish({ ...current, ...patch });
        return true;
      }
    },
    controls: { getDraft: draftStore.get, publish: draftStore.publish },
    state: { draft: draftStore.draft }
  };
}

function useNoticeTemplateDraftStore() {
  const [draft, setDraftState] = useState<NoticeTemplateDraft | null>(null);
  const draftRef = useRef<NoticeTemplateDraft | null>(null);
  const publish = (next: NoticeTemplateDraft | null) => {
    draftRef.current = next;
    setDraftState(next);
  };
  return { draft, get: () => draftRef.current, publish };
}

type NoticeTemplateDraftStore = ReturnType<typeof useNoticeTemplateDraftStore>;

function useNoticeTemplateDetailEditor({
  draftStore,
  capabilities,
  guardWritable,
  notifyLoadFailure,
  operation,
  provider
}: {
  capabilities: NoticeTemplateActionCapabilities;
  draftStore: NoticeTemplateDraftStore;
  guardWritable: (template: NoticeTemplateResourceRecord) => boolean;
  notifyLoadFailure: () => void;
  operation: NoticeTemplateOperationController;
  provider: DataProvider;
}) {
  const pendingRef = useRef<{
    id: number;
    owner: Parameters<NoticeTemplateOperationController['isCurrent']>[0];
    promise: Promise<void>;
  } | null>(null);
  const retire = () => {
    if (!operation.supersedeDetail()) return false;
    pendingRef.current = null;
    return true;
  };
  const edit = (template: NoticeTemplateResourceRecord): Promise<void> => {
    if (!canEditNoticeTemplate(capabilities, template)) {
      if (isNoticeTemplateReadOnly(template)) guardWritable(template);
      return Promise.resolve();
    }
    if (template.backendId == null || !provider.getOne) return Promise.resolve();
    if (pendingRef.current?.id === template.backendId) return pendingRef.current.promise;
    const owner = operation.beginDetail();
    if (!owner) return Promise.resolve();
    draftStore.publish(null);
    const promise = loadDetail(template.backendId, owner);
    pendingRef.current = { id: template.backendId, owner, promise };
    return promise;
  };
  const loadDetail = async (id: number, owner: Parameters<NoticeTemplateOperationController['isCurrent']>[0]) => {
    try {
      const response = await provider.getOne<NoticeTemplateResourceRecord>({
        resource: noticeTemplateResourceName,
        id
      });
      if (!operation.isCurrent(owner)) return;
      if (isNoticeTemplateReadOnly(response.data)) throw new Error('Preset template cannot be edited');
      draftStore.publish(noticeTemplateDraftFromResource(response.data));
    } catch {
      if (operation.isCurrent(owner)) notifyLoadFailure();
    } finally {
      if (pendingRef.current?.owner === owner) pendingRef.current = null;
      operation.end(owner);
    }
  };
  return { edit, retire };
}

export type NoticeTemplateEditorController = ReturnType<typeof useNoticeTemplateEditorController>;
