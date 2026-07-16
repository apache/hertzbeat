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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Skeleton, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsNav } from '@/shared/settings/settings-nav';

import { loadObjectStore, saveObjectStore } from '../api/object-store-api';
import { ObjectStoreEditor } from '../components/object-store-editor';
import styles from '../components/object-store.module.css';
import {
  createObjectStoreDraft,
  isObjectStoreDirty,
  validateObjectStoreDraft,
  type ObjectStoreDraft
} from '../model/object-store-model';

export function ObjectStorePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const objectStore = useQuery({ queryKey: ['config', 'oss'], queryFn: loadObjectStore });
  const [draft, setDraft] = useState<ObjectStoreDraft | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const baseline = createObjectStoreDraft(objectStore.data);
  const current = draft ?? baseline;
  const missingFields = validateObjectStoreDraft(current);
  const dirty = draft != null && isObjectStoreDirty(draft, baseline);
  const save = useMutation({
    mutationFn: saveObjectStore,
    onSuccess: () => {
      setDraft(null);
      setShowValidation(false);
      void queryClient.invalidateQueries({ queryKey: ['config', 'oss'] });
      void message.success(t('objectStore.saveSuccess'));
    },
    onError: () => void message.error(t('objectStore.saveFailed'))
  });

  const updateDraft = (next: ObjectStoreDraft) => {
    setDraft(next);
    setShowValidation(false);
  };
  const submit = () => {
    if (missingFields.length > 0) {
      setShowValidation(true);
      return;
    }
    if (dirty) save.mutate(current);
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('objectStore.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('objectStore.description')}</Typography.Text>
      </header>
      <SettingsNav />
      {objectStore.isError && (
        <Alert
          type="error"
          showIcon
          message={t('objectStore.unavailable')}
          action={<Button size="small" onClick={() => void objectStore.refetch()}>{t('common.retry')}</Button>}
        />
      )}
      {objectStore.isPending && <Skeleton active paragraph={{ rows: 6 }} />}
      {objectStore.isSuccess && (
        <ObjectStoreEditor
          current={current}
          missingFields={missingFields}
          dirty={dirty}
          showValidation={showValidation}
          saving={save.isPending}
          onUpdate={updateDraft}
          onSubmit={submit}
          onDiscard={() => {
            setDraft(null);
            setShowValidation(false);
          }}
        />
      )}
    </div>
  );
}
