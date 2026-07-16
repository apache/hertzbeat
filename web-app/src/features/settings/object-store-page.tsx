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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Input, Select, Skeleton, Typography } from "antd";
import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import styles from "./object-store-page.module.css";
import { loadObjectStore, saveObjectStore } from "./object-store-api";
import {
  changeObjectStoreType,
  createObjectStoreDraft,
  isObjectStoreDirty,
  objectStoreTypeDefinitions,
  updateObjectStoreField,
  validateObjectStoreDraft,
  type ObjectStoreDraft,
} from "./object-store-model";
import { SettingsNav } from '@/shared/settings/settings-nav';

const obsFieldDefinitions = [
  {
    key: "accessKey",
    labelKey: "objectStore.obs.accessKey",
    placeholderKey: "objectStore.obs.accessKeyPlaceholder",
    secret: false,
  },
  {
    key: "secretKey",
    labelKey: "objectStore.obs.secretKey",
    placeholderKey: "objectStore.obs.secretKeyPlaceholder",
    secret: true,
  },
  {
    key: "bucketName",
    labelKey: "objectStore.obs.bucketName",
    placeholderKey: "objectStore.obs.bucketNamePlaceholder",
    secret: false,
  },
  {
    key: "endpoint",
    labelKey: "objectStore.obs.endpoint",
    placeholderKey: "objectStore.obs.endpointPlaceholder",
    secret: false,
  },
  {
    key: "savePath",
    labelKey: "objectStore.obs.savePath",
    placeholderKey: "objectStore.obs.savePathPlaceholder",
    secret: false,
  },
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

function ObjectStoreEditor(props: ObjectStoreEditorProps) {
  const { t } = useTranslation();
  const { current } = props;
  return (
    <>
      {props.showValidation && (
        <Alert
          type="warning"
          showIcon
          title={t("objectStore.validation")}
          description={props.missingFields.map((field) => t(`objectStore.obs.${field}`)).join(", ")}
        />
      )}
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{t("objectStore.type.label")}</span>
          <span className={styles.control}>
            <Select
              value={current.type}
              options={objectStoreTypeDefinitions.map((definition) => ({
                value: definition.value,
                label: t(definition.labelKey),
              }))}
              onChange={(type) => props.onUpdate(changeObjectStoreType(current, type))}
            />
            <Typography.Text type="secondary">
              {t(`objectStore.typeHelp.${current.type.toLowerCase()}`)}
            </Typography.Text>
          </span>
        </label>
        {current.type === "OBS" &&
          obsFieldDefinitions.map((field) => (
            <ObjectStoreField key={field.key} draft={current} definition={field} onUpdate={props.onUpdate} />
          ))}
      </div>
      <div className={styles.actions}>
        <Button type="primary" loading={props.saving} disabled={!props.dirty} onClick={props.onSubmit}>
          {t("common.save")}
        </Button>
        <Button disabled={!props.dirty || props.saving} onClick={props.onDiscard}>
          {t("objectStore.discard")}
        </Button>
        {!props.dirty && <Typography.Text type="secondary">{t("objectStore.noChanges")}</Typography.Text>}
      </div>
    </>
  );
}

function ObjectStoreField({
  draft,
  definition,
  onUpdate,
}: {
  draft: ObjectStoreDraft;
  definition: (typeof obsFieldDefinitions)[number];
  onUpdate: (draft: ObjectStoreDraft) => void;
}) {
  const { t } = useTranslation();
  const inputProps = {
    value: String(draft.config[definition.key] ?? ""),
    placeholder: t(definition.placeholderKey),
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      onUpdate(updateObjectStoreField(draft, definition.key, event.target.value)),
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

export function ObjectStorePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const objectStore = useQuery({ queryKey: ["config", "oss"], queryFn: loadObjectStore });
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
      void queryClient.invalidateQueries({ queryKey: ["config", "oss"] });
      void message.success(t("objectStore.saveSuccess"));
    },
    onError: () => void message.error(t("objectStore.saveFailed")),
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
        <Typography.Title level={2}>{t("objectStore.title")}</Typography.Title>
        <Typography.Text type="secondary">{t("objectStore.description")}</Typography.Text>
      </header>
      <SettingsNav />
      {objectStore.isError && (
        <Alert
          type="error"
          showIcon
          title={t("objectStore.unavailable")}
          action={
            <Button size="small" onClick={() => void objectStore.refetch()}>
              {t("common.retry")}
            </Button>
          }
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
