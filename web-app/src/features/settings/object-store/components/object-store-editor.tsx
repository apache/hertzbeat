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

import { Alert, Button, Input, Select, Typography } from 'antd';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  changeObjectStoreType,
  objectStoreTypeDefinitions,
  updateObjectStoreField,
  type ObjectStoreDraft
} from '../model/object-store-model';
import styles from './object-store.module.css';

const obsFieldDefinitions = [
  { key: 'accessKey', labelKey: 'objectStore.obs.accessKey', placeholderKey: 'objectStore.obs.accessKeyPlaceholder', secret: false },
  { key: 'secretKey', labelKey: 'objectStore.obs.secretKey', placeholderKey: 'objectStore.obs.secretKeyPlaceholder', secret: true },
  { key: 'bucketName', labelKey: 'objectStore.obs.bucketName', placeholderKey: 'objectStore.obs.bucketNamePlaceholder', secret: false },
  { key: 'endpoint', labelKey: 'objectStore.obs.endpoint', placeholderKey: 'objectStore.obs.endpointPlaceholder', secret: false },
  { key: 'savePath', labelKey: 'objectStore.obs.savePath', placeholderKey: 'objectStore.obs.savePathPlaceholder', secret: false }
] as const;

type ObjectStoreEditorProps = {
  current: ObjectStoreDraft;
  missingFields: string[];
  dirty: boolean;
  showValidation: boolean;
  saving: boolean;
  onUpdate: (draft: ObjectStoreDraft) => void;
  onSubmit: () => void;
  onDiscard: () => void;
};

export function ObjectStoreEditor(props: ObjectStoreEditorProps) {
  const { t } = useTranslation();
  const { current } = props;
  return (
    <>
      {props.showValidation && (
        <Alert
          type="warning"
          showIcon
          message={t('objectStore.validation')}
          description={props.missingFields.map((field) => t(`objectStore.obs.${field}`)).join(', ')}
        />
      )}
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t('objectStore.type.label')}</span>
          <span className={styles.control}>
            <Select
              value={current.type}
              options={objectStoreTypeDefinitions.map((definition) => ({
                value: definition.value,
                label: t(definition.labelKey)
              }))}
              onChange={(type) => props.onUpdate(changeObjectStoreType(current, type))}
            />
            <Typography.Text type="secondary">
              {t(`objectStore.typeHelp.${current.type.toLowerCase()}`)}
            </Typography.Text>
          </span>
        </label>
        {current.type === 'OBS' && obsFieldDefinitions.map((field) => (
          <ObjectStoreField key={field.key} draft={current} definition={field} onUpdate={props.onUpdate} />
        ))}
      </div>
      <div className={styles.actions}>
        <Button type="primary" loading={props.saving} disabled={!props.dirty} onClick={props.onSubmit}>
          {t('common.save')}
        </Button>
        <Button disabled={!props.dirty || props.saving} onClick={props.onDiscard}>
          {t('objectStore.discard')}
        </Button>
        {!props.dirty && <Typography.Text type="secondary">{t('objectStore.noChanges')}</Typography.Text>}
      </div>
    </>
  );
}

function ObjectStoreField({
  draft,
  definition,
  onUpdate
}: {
  draft: ObjectStoreDraft;
  definition: (typeof obsFieldDefinitions)[number];
  onUpdate: (draft: ObjectStoreDraft) => void;
}) {
  const { t } = useTranslation();
  const inputProps = {
    value: String(draft.config[definition.key] ?? ''),
    placeholder: t(definition.placeholderKey),
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      onUpdate(updateObjectStoreField(draft, definition.key, event.target.value))
  };
  return (
    <label className={styles.field}>
      <span className={`${styles.label} ${styles.required}`}>{t(definition.labelKey)}</span>
      <span className={styles.control}>
        {definition.secret ? <Input.Password {...inputProps} /> : <Input {...inputProps} />}
      </span>
    </label>
  );
}
