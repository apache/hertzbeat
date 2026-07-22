/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Form, Input, Modal, Switch, Upload, Typography } from 'antd';
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
          {...(props.invalid.name ? { validateStatus: 'error' as const, help: t('plugins.validation.name') } : {})}
        >
          <Input
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
        <Form.Item label={t('plugins.initialStatus')}>
          <Switch checked={props.upload?.enableStatus ?? true} disabled={props.busy} onChange={props.onEnabled} />
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
        <Typography.Link>{t('plugins.chooseJar')}</Typography.Link>
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
