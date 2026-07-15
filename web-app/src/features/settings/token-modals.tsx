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

import { Alert, Button, Input, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";

import styles from "./token-page.module.css";
import { tokenExpirationDefinitions, tokenScopeDefinitions, type TokenDraft } from "./token-model";

type TokenGeneratorModalProps = {
  draft: TokenDraft;
  saving: boolean;
  onChange: (draft: TokenDraft) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function TokenGeneratorModal(props: TokenGeneratorModalProps) {
  const { t } = useTranslation();
  const { draft } = props;
  return (
    <Modal
      open
      title={t("token.generateTitle")}
      okText={t("token.generate")}
      cancelText={t("common.cancel")}
      confirmLoading={props.saving}
      onCancel={props.onCancel}
      onOk={props.onSubmit}
    >
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={`${styles.label} ${styles.required}`}>{t("token.name")}</span>
          <Input
            value={draft.name}
            placeholder={t("token.namePlaceholder")}
            onChange={(event) => props.onChange({ ...draft, name: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("token.scope.label")}</span>
          <Select
            value={draft.scope}
            options={tokenScopeDefinitions.map((definition) => ({
              value: definition.value,
              label: t(definition.labelKey),
            }))}
            onChange={(scope) => props.onChange({ ...draft, scope })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("token.expires")}</span>
          <Select
            value={draft.expireSeconds}
            options={tokenExpirationDefinitions.map((definition) => ({
              value: definition.value,
              label: t(definition.labelKey),
            }))}
            onChange={(expireSeconds) => props.onChange({ ...draft, expireSeconds })}
          />
        </label>
      </div>
    </Modal>
  );
}

type GeneratedTokenModalProps = {
  token: string;
  onCopy: () => void;
  onClose: () => void;
};

export function GeneratedTokenModal(props: GeneratedTokenModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      title={t("token.generatedTitle")}
      okText={t("token.done")}
      cancelButtonProps={{ style: { display: "none" } }}
      mask={{ closable: false }}
      onOk={props.onClose}
      onCancel={props.onClose}
    >
      <div className={styles.tokenResult}>
        <Alert type="warning" showIcon title={t("token.generatedNotice")} />
        <pre className={styles.tokenValue}>{props.token}</pre>
        <Button onClick={props.onCopy}>{t("token.copy")}</Button>
      </div>
    </Modal>
  );
}
