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

import {
  useOne,
  useUpdate,
  type HttpError,
  type OpenNotificationParams
} from '@refinedev/core';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createObjectStoreDraft,
  isObjectStoreDirty,
  objectStoreResourceId,
  validateObjectStoreDraft,
  type ObjectStoreDraft,
  type ObjectStoreResourceRecord
} from '../model/object-store-model';

const objectStoreResource = 'object-store';
const objectStoreDataProvider = 'object-store';
const detailInvalidation = ['detail'] as const;

export function useObjectStoreResourceController() {
  const { t } = useTranslation();
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
    successNotification: () => notice(t('objectStore.saveSuccess'), 'success'),
    errorNotification: () => notice(t('objectStore.saveFailed'), 'error')
  });
  const [draft, setDraft] = useState<ObjectStoreDraft | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const baseline = createObjectStoreDraft(resource.result);
  const current = draft ?? baseline;
  const missingFields = validateObjectStoreDraft(current);
  const dirty = draft !== null && isObjectStoreDirty(draft, baseline);

  const updateDraft = useCallback((next: ObjectStoreDraft) => {
    setDraft(next);
    setShowValidation(false);
  }, []);
  const discard = useCallback(() => {
    setDraft(null);
    setShowValidation(false);
  }, []);
  const retry = useCallback(() => {
    void resource.query.refetch();
  }, [resource.query]);
  const submit = useCallback(() => {
    if (missingFields.length > 0) {
      setShowValidation(true);
      return;
    }
    if (!dirty) return;
    update.mutate({
      id: objectStoreResourceId,
      resource: objectStoreResource,
      dataProviderName: objectStoreDataProvider,
      invalidates: [...detailInvalidation],
      mutationMode: 'pessimistic',
      values: current
    }, {
      onSuccess: () => {
        setDraft(null);
        setShowValidation(false);
      }
    });
  }, [current, dirty, missingFields.length, update]);

  const kind = resolveResourceKind(
    resource.query.isPending,
    resource.query.isError,
    resource.query.error,
    resource.result
  );

  return {
    discard,
    retry,
    state: kind === 'ready'
      ? {
          kind,
          current,
          dirty,
          missingFields,
          saving: update.mutation.isPending,
          showValidation
        } as const
      : { kind } as const,
    submit,
    updateDraft
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

function notice(message: string, type: OpenNotificationParams['type']): OpenNotificationParams {
  return { message, type };
}
