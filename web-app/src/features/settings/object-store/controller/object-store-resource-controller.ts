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

import { useDataProvider, useInvalidate, useNotification, useOne, type HttpError } from '@refinedev/core';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';

import {
  objectStoreResourceId,
  userCanWriteObjectStore,
  type ObjectStoreDraft,
  type ObjectStoreResourceRecord
} from '../model/object-store-model';
import { classifyObjectStoreReadFailure, ObjectStoreRequestFailure } from '../model/object-store-failure';
import { useObjectStoreEditorController } from './object-store-editor-controller';
import type { ObjectStoreMutation } from './object-store-save-transaction';

const objectStoreResource = 'object-store';
const objectStoreDataProvider = 'object-store';

export function useObjectStoreResourceController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const canWrite = userCanWriteObjectStore(useSession().session?.roles ?? []);
  const resource = useOne<ObjectStoreResourceRecord, HttpError>({
    resource: objectStoreResource,
    id: objectStoreResourceId,
    dataProviderName: objectStoreDataProvider,
    errorNotification: false
  });
  const update = useObjectStoreMutation();
  const refetch = resource.query.refetch;
  const reread = useCallback(async () => {
    try {
      const result = await refetch();
      return {
        data: result.isError ? undefined : result.data?.data,
        error: result.isError ? result.error : null
      };
    } catch (error) {
      return { data: undefined, error };
    }
  }, [refetch]);
  const editor = useObjectStoreEditorController(
    resource.result,
    reread,
    update,
    {
      notifyFailure: () => notification.open?.({ message: t('objectStore.unavailable'), type: 'error' }),
      notifyRejected: () => notification.open?.({ message: t('objectStore.saveFailed'), type: 'error' }),
      notifySuccess: () => notification.open?.({ message: t('objectStore.saveSuccess'), type: 'success' })
    },
    canWrite
  );
  const kind = resolveResourceKind(
    resource.query.isPending,
    resource.query.isError,
    resource.query.error,
    resource.result
  );
  const canEditMissingConfiguration = kind === 'missing' && canWrite;

  return {
    discard: editor.discard,
    canWrite,
    retry: editor.retry,
    state:
      kind === 'ready' || canEditMissingConfiguration || editor.state.locked
        ? ({ kind: 'ready', unconfigured: !editor.state.configured, ...editor.state } as const)
        : ({ kind } as const),
    submit: editor.submit,
    updateDraft: editor.updateDraft
  };
}

function useObjectStoreMutation() {
  const provider = useDataProvider()(objectStoreDataProvider);
  const invalidate = useInvalidate();
  return useMemo<ObjectStoreMutation>(
    () => ({
      mutate: (draft, callbacks) => {
        if (!provider.update) {
          callbacks.onError(
            new ObjectStoreRequestFailure('invalid', 'rejected', { code: 'OBJECT_STORE_UPDATE_UNSUPPORTED' })
          );
          return;
        }
        void provider
          .update<ObjectStoreResourceRecord, ObjectStoreDraft>({
            resource: objectStoreResource,
            id: objectStoreResourceId,
            variables: draft
          })
          .then(result => {
            callbacks.onSuccess(result);
            // The canonical provider result commits the editor state; cache invalidation is only best-effort cleanup.
            void Promise.resolve()
              .then(() =>
                invalidate({
                  resource: objectStoreResource,
                  id: objectStoreResourceId,
                  dataProviderName: objectStoreDataProvider,
                  invalidates: ['detail']
                })
              )
              .catch(() => undefined);
          }, callbacks.onError);
      }
    }),
    [invalidate, provider]
  );
}

function resolveResourceKind(
  isPending: boolean,
  isError: boolean,
  error: HttpError | null,
  record: ObjectStoreResourceRecord | undefined
) {
  if (isPending) return 'loading';
  if (isError) return classifyObjectStoreReadFailure(error);
  return record ? 'ready' : 'missing';
}
