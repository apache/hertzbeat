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

import { useNotification, useOne, useUpdate, type HttpError } from '@refinedev/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  objectStoreResourceId,
  type ObjectStoreDraft,
  type ObjectStoreResourceRecord
} from '../model/object-store-model';
import { useObjectStoreEditorController } from './object-store-editor-controller';

const objectStoreResource = 'object-store';
const objectStoreDataProvider = 'object-store';
const detailInvalidation = ['detail'] as const;

export function useObjectStoreResourceController() {
  const { t } = useTranslation();
  const notification = useNotification();
  const resource = useOne<ObjectStoreResourceRecord, HttpError>({
    resource: objectStoreResource,
    id: objectStoreResourceId,
    dataProviderName: objectStoreDataProvider,
    errorNotification: false
  });
  const update = useUpdate<ObjectStoreResourceRecord, HttpError, ObjectStoreDraft>({
    resource: objectStoreResource,
    dataProviderName: objectStoreDataProvider,
    invalidates: [...detailInvalidation],
    mutationMode: 'pessimistic',
    successNotification: false,
    errorNotification: false
  });
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
  const editor = useObjectStoreEditorController(resource.result, reread, update, {
    notifyFailure: () => notification.open?.({ message: t('objectStore.unavailable'), type: 'error' }),
    notifyRejected: () => notification.open?.({ message: t('objectStore.saveFailed'), type: 'error' }),
    notifySuccess: () => notification.open?.({ message: t('objectStore.saveSuccess'), type: 'success' })
  });
  const kind = resolveResourceKind(
    resource.query.isPending,
    resource.query.isError,
    resource.query.error,
    resource.result
  );

  return {
    discard: editor.discard,
    retry: editor.retry,
    state:
      kind === 'ready' || editor.state.locked
        ? ({
            kind: 'ready',
            ...editor.state
          } as const)
        : ({ kind } as const),
    submit: editor.submit,
    updateDraft: editor.updateDraft
  };
}

function resolveResourceKind(
  isPending: boolean,
  isError: boolean,
  error: HttpError | null,
  record: ObjectStoreResourceRecord | undefined
) {
  if (isPending) return 'loading';
  if (isError) return isUnavailable(error) ? 'unavailable' : 'error';
  return record ? 'ready' : 'error';
}

function isUnavailable(error: HttpError | null) {
  const code: unknown = error?.code;
  if (code === 'OBJECT_STORE_RESPONSE_INVALID') return false;
  return error?.statusCode === 0 || [502, 503, 504].includes(error?.statusCode ?? -1);
}
