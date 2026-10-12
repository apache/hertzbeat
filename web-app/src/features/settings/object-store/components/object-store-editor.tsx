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

import { CloudServerOutlined, DatabaseOutlined, FolderOpenOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Typography } from 'antd';
import { useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import {
  changeObjectStoreType,
  objectStoreTypePickerNeedsSearch,
  objectStoreTypeDefinitions,
  updateObjectStoreField,
  type ObjectStoreDraft,
  type ObjectStoreType
} from '../model/object-store-model';
import styles from './object-store.module.css';

const obsFieldDefinitions = [
  {
    key: 'accessKey',
    labelKey: 'objectStore.obs.accessKey',
    placeholderKey: 'objectStore.obs.accessKeyPlaceholder',
    secret: true
  },
  {
    key: 'secretKey',
    labelKey: 'objectStore.obs.secretKey',
    placeholderKey: 'objectStore.obs.secretKeyPlaceholder',
    secret: true
  },
  {
    key: 'bucketName',
    labelKey: 'objectStore.obs.bucketName',
    placeholderKey: 'objectStore.obs.bucketNamePlaceholder',
    secret: false
  },
  {
    key: 'endpoint',
    labelKey: 'objectStore.obs.endpoint',
    placeholderKey: 'objectStore.obs.endpointPlaceholder',
    secret: false
  },
  {
    key: 'savePath',
    labelKey: 'objectStore.obs.savePath',
    placeholderKey: 'objectStore.obs.savePathPlaceholder',
    secret: false
  }
] as const;

type ObjectStoreEditorProps = {
  current: ObjectStoreDraft;
  canSubmit: boolean;
  missingFields: string[];
  dirty: boolean;
  locked: boolean;
  showValidation: boolean;
  saving: boolean;
  canWrite: boolean;
  unconfigured: boolean;
  onUpdate: (draft: ObjectStoreDraft) => void;
  onSubmit: () => void;
  onDiscard: () => void;
};

export function ObjectStoreEditor(props: ObjectStoreEditorProps) {
  const { t } = useTranslation();
  const { current } = props;
  return (
    <section className={styles.surface} data-hb-object-store-editor="">
      {props.showValidation && (
        <OperationalStatePanel
          kind="error"
          title={t('objectStore.validation')}
          description={props.missingFields.map(field => t(`objectStore.obs.${field}`)).join(', ')}
        />
      )}
      <div className={styles.workspace}>
        <ObjectStoreTypeField
          current={current}
          disabled={!props.canWrite || props.locked}
          unconfigured={props.unconfigured}
          onUpdate={props.onUpdate}
        />
        <ObjectStoreTypeDetails
          current={current}
          disabled={!props.canWrite || props.locked}
          onUpdate={props.onUpdate}
        />
      </div>
      <ObjectStoreActions {...props} />
    </section>
  );
}

function ObjectStoreStatus({ unconfigured }: { unconfigured: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={unconfigured ? styles.statusPending : styles.statusConfigured}
      data-hb-object-store-status=""
      data-status={unconfigured ? 'unconfigured' : 'configured'}
    >
      <span className={styles.statusDot} aria-hidden="true" />
      {t(unconfigured ? 'objectStore.status.unconfigured' : 'objectStore.status.configured')}
    </span>
  );
}

function ObjectStoreActions(props: ObjectStoreEditorProps) {
  const { t } = useTranslation();
  if (!props.canWrite || (!props.canSubmit && !props.dirty)) return null;
  return (
    <footer className={styles.actions}>
      <Typography.Text type="secondary" className={styles.actionHint!}>
        {t(props.unconfigured ? 'objectStore.activationHint' : 'objectStore.unsavedHint')}
      </Typography.Text>
      <div className={styles.actionButtons}>
        {props.dirty && (
          <Button disabled={props.locked} onClick={props.onDiscard}>
            {t('objectStore.discard')}
          </Button>
        )}
        <Button
          type="primary"
          loading={props.saving}
          disabled={!props.canSubmit || props.locked}
          onClick={props.onSubmit}
        >
          {props.unconfigured
            ? t(`objectStore.activate.${props.current.type.toLowerCase()}`)
            : t('objectStore.migrateAndSave')}
        </Button>
      </div>
    </footer>
  );
}

const objectStoreTypeIcons: Record<ObjectStoreType, typeof DatabaseOutlined> = {
  DATABASE: DatabaseOutlined,
  FILE: FolderOpenOutlined,
  OBS: CloudServerOutlined
};

function ObjectStoreTypeField({
  current,
  disabled,
  unconfigured,
  onUpdate
}: {
  current: ObjectStoreDraft;
  disabled: boolean;
  unconfigured: boolean;
  onUpdate: (draft: ObjectStoreDraft) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const showSearch = objectStoreTypePickerNeedsSearch(objectStoreTypeDefinitions.length);
  const visibleDefinitions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return objectStoreTypeDefinitions;
    return objectStoreTypeDefinitions.filter(definition =>
      `${t(definition.labelKey)} ${t(`objectStore.typeHelp.${definition.value.toLowerCase()}`)}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, t]);
  return (
    <div className={styles.typeFieldset}>
      <div className={styles.typeHeader} data-hb-object-store-type-header="">
        <span className={styles.typeLegend}>{t('objectStore.type.label')}</span>
        <ObjectStoreStatus unconfigured={unconfigured} />
      </div>
      {showSearch && (
        <Input
          className={styles.typeSearch}
          type="search"
          allowClear
          prefix={<SearchOutlined aria-hidden="true" />}
          aria-label={t('objectStore.searchTypes')}
          placeholder={t('objectStore.searchTypes')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      )}
      <div
        className={styles.typeOptions}
        role="radiogroup"
        aria-label={t('objectStore.type.label')}
        data-hb-object-store-method-list=""
        data-scrollable="true"
      >
        {visibleDefinitions.map(definition => {
          const Icon = objectStoreTypeIcons[definition.value];
          return (
            <label className={styles.typeOption} key={definition.value}>
              <input
                className={styles.typeInput}
                type="radio"
                name="object-store-type"
                value={definition.value}
                checked={current.type === definition.value}
                disabled={disabled}
                onChange={() => onUpdate(changeObjectStoreType(current, definition.value))}
              />
              <span className={styles.typeOptionBody}>
                <span className={styles.typeIcon} aria-hidden="true">
                  <Icon />
                </span>
                <span className={styles.typeCopy}>
                  <strong>{t(definition.labelKey)}</strong>
                </span>
              </span>
            </label>
          );
        })}
        {visibleDefinitions.length === 0 && (
          <Typography.Text type="secondary" className={styles.noTypes!}>
            {t('objectStore.noMatchingTypes')}
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

function ObjectStoreTypeDetails({
  current,
  disabled,
  onUpdate
}: {
  current: ObjectStoreDraft;
  disabled: boolean;
  onUpdate: (draft: ObjectStoreDraft) => void;
}) {
  if (current.type === 'OBS') {
    return <ObjectStoreObsFields current={current} disabled={disabled} onUpdate={onUpdate} />;
  }
  return <ObjectStoreMethodSummary type={current.type} />;
}

function ObjectStoreMethodSummary({ type }: { type: Exclude<ObjectStoreType, 'OBS'> }) {
  const { t } = useTranslation();
  const Icon = objectStoreTypeIcons[type];
  return (
    <section className={styles.methodSummary} aria-labelledby="object-store-method-title">
      <span className={styles.summaryIcon} aria-hidden="true">
        <Icon />
      </span>
      <Typography.Title level={4} id="object-store-method-title" className={styles.methodTitle!}>
        {t(`objectStore.type.${type.toLowerCase()}`)}
      </Typography.Title>
      <Typography.Text type="secondary" className={styles.methodDescription!}>
        {t(`objectStore.typeHelp.${type.toLowerCase()}`)}
      </Typography.Text>
    </section>
  );
}

function ObjectStoreObsFields({
  current,
  disabled,
  onUpdate
}: {
  current: ObjectStoreDraft;
  disabled: boolean;
  onUpdate: (draft: ObjectStoreDraft) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.obsSection} aria-labelledby="object-store-obs-title">
      <div className={styles.obsHeader}>
        <Typography.Title level={4} id="object-store-obs-title" className={styles.obsTitle!}>
          {t('objectStore.obsSectionTitle')}
        </Typography.Title>
        <Typography.Text type="secondary">{t('objectStore.obsSectionDescription')}</Typography.Text>
      </div>
      <div className={styles.obsFields}>
        {obsFieldDefinitions.map(field => (
          <ObjectStoreField
            key={field.key}
            draft={current}
            definition={field}
            disabled={disabled}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  );
}

function ObjectStoreField({
  draft,
  definition,
  disabled,
  onUpdate
}: {
  draft: ObjectStoreDraft;
  definition: (typeof obsFieldDefinitions)[number];
  disabled: boolean;
  onUpdate: (draft: ObjectStoreDraft) => void;
}) {
  const { t } = useTranslation();
  const configured = definition.secret && draft.configuredSecrets.includes(definition.key);
  const inputProps = {
    value: String(draft.config[definition.key] ?? ''),
    disabled,
    placeholder: t(definition.placeholderKey),
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      onUpdate(updateObjectStoreField(draft, definition.key, event.target.value))
  };
  return (
    <label className={`${styles.field} ${definition.key === 'endpoint' ? styles.wideField : ''}`}>
      <span className={`${styles.label} ${styles.required}`}>{t(definition.labelKey)}</span>
      <span className={styles.control}>
        {definition.secret ? <Input.Password {...inputProps} autoComplete="new-password" /> : <Input {...inputProps} />}
        {configured && !inputProps.value.trim() && (
          <Typography.Text type="secondary">{t('objectStore.obs.configuredCredential')}</Typography.Text>
        )}
      </span>
    </label>
  );
}
