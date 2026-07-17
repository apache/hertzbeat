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

import { Checkbox, Input, InputNumber, Modal, Select, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";

import {
  selectSmsProvider,
  setSmsSecretCleared,
  smsProviderDefinitions,
  updateSmsProviderField,
  type EmailServerDraft,
  type SmsProviderType,
  type SmsSecret,
  type SmsServerDraft,
} from "../model/message-server-model";
import styles from "./message-server-editors.module.css";

export function EmailServerEditor({
  draft,
  saving,
  update,
  setSecretCleared,
  close,
  submit,
}: {
  draft: EmailServerDraft;
  saving: boolean;
  update: (patch: Partial<EmailServerDraft>) => void;
  setSecretCleared: (cleared: boolean) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={700}
      maskClosable={false}
      title={t("messageServer.email.edit")}
      okText={t("common.save")}
      cancelText={t("common.cancel")}
      confirmLoading={saving}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <label className={styles.field}>
          {t("messageServer.email.host")}
          <Input value={draft.emailHost} onChange={(event) => update({ emailHost: event.target.value })} />
        </label>
        <label className={styles.field}>
          {t("messageServer.email.port")}
          <InputNumber
            min={1}
            max={65_535}
            value={draft.emailPort}
            onChange={(emailPort) => update({ emailPort: emailPort ?? 0 })}
          />
        </label>
        <label className={styles.field}>
          {t("messageServer.email.username")}
          <Input
            type="email"
            value={draft.emailUsername}
            onChange={(event) => update({ emailUsername: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          {t("messageServer.email.password")}
          <Input.Password
            value={draft.emailPassword}
            placeholder={draft.clearSecrets.includes("emailPassword")
              ? t("messageServer.secret.clearPending")
              : draft.configuredSecrets.includes("emailPassword")
                ? t("messageServer.secret.retainHint") : t("messageServer.secret.enterHint")}
            onChange={(event) => update({ emailPassword: event.target.value })}
          />
        </label>
        {draft.configuredSecrets.includes("emailPassword") && (
          <div className={styles.secretControls}>
            <Typography.Text type="secondary">{t("messageServer.secret.configured")}</Typography.Text>
            <Checkbox checked={draft.clearSecrets.includes("emailPassword")}
              onChange={(event) => setSecretCleared(event.target.checked)}>
              {t("messageServer.secret.clearSaved")}
            </Checkbox>
          </div>
        )}
        <label className={styles.switchField}>
          <span>{t("messageServer.email.ssl")}</span>
          <Switch checked={draft.emailSsl} onChange={(emailSsl) => update({ emailSsl })} />
        </label>
        <label className={styles.switchField}>
          <span>{t("messageServer.email.starttls")}</span>
          <Switch checked={draft.emailStarttls} onChange={(emailStarttls) => update({ emailStarttls })} />
        </label>
        <label className={styles.switchField}>
          <span>{t("messageServer.enabled")}</span>
          <Switch checked={draft.enable} onChange={(enable) => update({ enable })} />
        </label>
      </div>
    </Modal>
  );
}

function SmsProviderFields({ draft, replace }: { draft: SmsServerDraft; replace: (draft: SmsServerDraft) => void }) {
  const { t } = useTranslation();
  const definition = smsProviderDefinitions.find((item) => item.type === draft.type)!;
  const values = draft[draft.type] as unknown as Record<string, string>;
  return definition.fields.map((field) => {
    if (draft.type === "unisms" && field.key === "accessKeySecret" && draft.unisms.authMode !== "hmac") return null;
    const configured = field.secret && draft.configuredSecrets.includes(field.key as SmsSecret);
    const cleared = field.secret && draft.clearSecrets.includes(field.key as SmsSecret);
    return (
      <div className={styles.field} key={field.key}>
        <label>
          {t(field.labelKey)}
          {field.kind === "authMode" ? (
            <Select<string>
              value={values[field.key] ?? "simple"}
              options={[
                { value: "simple", label: t("messageServer.sms.authModes.simple") },
                { value: "hmac", label: t("messageServer.sms.authModes.hmac") },
              ]}
              onChange={(value) => replace(updateSmsProviderField(draft, field.key, value))}
            />
          ) : field.secret ? (
            <Input.Password value={values[field.key]}
              placeholder={cleared ? t("messageServer.secret.clearPending")
                : configured ? t("messageServer.secret.retainHint") : t("messageServer.secret.enterHint")}
              onChange={(event) => replace(updateSmsProviderField(draft, field.key, event.target.value))} />
          ) : (
            <Input value={values[field.key]}
              onChange={(event) => replace(updateSmsProviderField(draft, field.key, event.target.value))} />
          )}
        </label>
        {configured && (
          <div className={styles.secretControls}>
            <Typography.Text type="secondary">{t("messageServer.secret.configured")}</Typography.Text>
            <Checkbox checked={cleared}
              onChange={(event) => replace(setSmsSecretCleared(draft, field.key as SmsSecret,
                event.target.checked))}>
              {t("messageServer.secret.clearSaved")}
            </Checkbox>
          </div>
        )}
      </div>
    );
  });
}

export function SmsServerEditor({
  draft,
  saving,
  replace,
  close,
  submit,
}: {
  draft: SmsServerDraft;
  saving: boolean;
  replace: (draft: SmsServerDraft) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={720}
      maskClosable={false}
      title={t("messageServer.sms.edit")}
      okText={t("common.save")}
      cancelText={t("common.cancel")}
      confirmLoading={saving}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <label className={`${styles.field} ${styles.wide}`}>
          {t("messageServer.sms.provider")}
          <Select
            value={draft.type}
            options={smsProviderDefinitions.map((item) => ({ value: item.type, label: t(item.labelKey) }))}
            onChange={(type: SmsProviderType) => replace(selectSmsProvider(draft, type))}
          />
        </label>
        <SmsProviderFields draft={draft} replace={replace} />
        <label className={`${styles.switchField} ${styles.wide}`}>
          <span>{t("messageServer.enabled")}</span>
          <Switch checked={draft.enable} onChange={(enable) => replace({ ...draft, enable })} />
        </label>
      </div>
    </Modal>
  );
}
