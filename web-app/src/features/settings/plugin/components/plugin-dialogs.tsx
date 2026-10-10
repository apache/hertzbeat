/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Alert, Button, Form, Input, Modal, Switch, Upload, Typography } from 'antd';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { PluginDeleteTarget, PluginFailureKind, PluginUploadDraft } from '../model/plugin-model';

export function PluginUploadDialog(props: {
  upload: PluginUploadDraft | null;
  invalid: { name: boolean; jarFile: boolean };
  failure: PluginFailureKind | null;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  onName: (value: string) => void;
  onFile: (file: File | null) => void;
  onEnabled: (value: boolean) => void;
}) {
  const { t } = useTranslation();
  const nameId = useId();
  const statusId = useId();
  return (
    <Modal
      open={props.upload !== null}
      title={t('plugins.uploadTitle')}
      okText={t('plugins.upload')}
      cancelText={t('common.cancel')}
      confirmLoading={props.busy}
      closable={!props.busy}
      maskClosable={!props.busy}
      onCancel={props.onCancel}
      onOk={props.onSave}
    >
      {props.failure && <Alert type="error" showIcon message={t(`plugins.failure.${props.failure}`)} />}
      <Form layout="vertical">
        <Form.Item
          label={t('plugins.name')}
          htmlFor={nameId}
          {...(props.invalid.name ? { validateStatus: 'error' as const, help: t('plugins.validation.name') } : {})}
        >
          <Input
            id={nameId}
            value={props.upload?.name ?? ''}
            disabled={props.busy}
            onChange={event => props.onName(event.target.value)}
          />
        </Form.Item>
        <PluginJarField
          file={props.upload?.jarFile ?? null}
          invalid={props.invalid.jarFile}
          disabled={props.busy}
          onFile={props.onFile}
        />
        <Form.Item label={t('plugins.initialStatus')} htmlFor={statusId}>
          <Switch
            id={statusId}
            checked={props.upload?.enableStatus ?? true}
            disabled={props.busy}
            onChange={props.onEnabled}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function PluginJarField(props: {
  file: File | null;
  invalid: boolean;
  disabled: boolean;
  onFile: (file: File | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Form.Item
      label={t('plugins.jarFile')}
      {...(props.invalid ? { validateStatus: 'error' as const, help: t('plugins.validation.jarFile') } : {})}
    >
      <Upload
        accept=".jar"
        disabled={props.disabled}
        maxCount={1}
        showUploadList={false}
        beforeUpload={file => {
          props.onFile(file);
          return false;
        }}
      >
        <Button
          htmlType="button"
          disabled={props.disabled}
          onKeyDown={event => {
            // Native button activation supplies the click; avoid Upload's extra Enter handler.
            if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
          }}
        >
          {t('plugins.chooseJar')}
        </Button>
      </Upload>
      {props.file && <Typography.Text>{props.file.name}</Typography.Text>}
    </Form.Item>
  );
}

export function PluginDeleteDialog(props: {
  target: PluginDeleteTarget | null;
  failure: PluginFailureKind | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={props.target !== null}
      title={t('plugins.deleteTitle')}
      okText={t('common.delete')}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: true, loading: props.busy }}
      cancelButtonProps={{ disabled: props.busy }}
      closable={!props.busy}
      maskClosable={!props.busy}
      onCancel={props.onCancel}
      onOk={props.onConfirm}
    >
      {props.failure && <Alert type="error" showIcon message={t(`plugins.failure.${props.failure}`)} />}
      {t(props.target?.mode === 'batch' ? 'plugins.deleteBatchConfirm' : 'plugins.deleteConfirm', {
        target: props.target?.label ?? ''
      })}
    </Modal>
  );
}
