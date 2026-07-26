/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Form, Modal, Space, Typography, Upload } from 'antd';
import { useTranslation } from 'react-i18next';

import { alertRuleImportAccept, type AlertRuleImportState } from '../model/alert-rule-import-model';

type AlertRuleImportDialogProps = {
  state: AlertRuleImportState;
  onCancel: () => void;
  onFile: (file: File | null) => void;
  onInspect: () => Promise<boolean>;
  onSubmit: () => Promise<boolean>;
};

export function AlertRuleImportDialog({ state, onCancel, onFile, onInspect, onSubmit }: AlertRuleImportDialogProps) {
  const { t } = useTranslation();
  const file = state.draft?.file ?? null;
  return (
    <Modal
      open={state.draft !== null}
      title={t('alertRules.import.title')}
      okText={t('alertRules.import.submit')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        loading: state.busy && !state.inspectionRequired,
        disabled: state.busy || state.inspectionRequired
      }}
      cancelButtonProps={{ disabled: state.busy }}
      closable={!state.busy}
      keyboard={!state.busy}
      maskClosable={!state.busy}
      onCancel={onCancel}
      onOk={() => void onSubmit()}
    >
      <Typography.Paragraph type="secondary">{t('alertRules.import.description')}</Typography.Paragraph>
      <AlertRuleImportFeedback state={state} onInspect={onInspect} />
      <Form layout="vertical">
        <Form.Item
          label={t('alertRules.import.file')}
          {...(state.invalid
            ? { validateStatus: 'error' as const, help: t(`alertRules.import.validation.${state.invalid}`) }
            : {})}
        >
          <Space wrap>
            <Upload
              accept={alertRuleImportAccept}
              disabled={state.busy || state.inspectionRequired}
              maxCount={1}
              showUploadList={false}
              beforeUpload={selected => {
                onFile(selected);
                return false;
              }}
            >
              <Button disabled={state.busy || state.inspectionRequired}>{t('alertRules.import.choose')}</Button>
            </Upload>
            {file ? <Typography.Text>{t('alertRules.import.selected', { name: file.name })}</Typography.Text> : null}
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

function AlertRuleImportFeedback({ state, onInspect }: Pick<AlertRuleImportDialogProps, 'state' | 'onInspect'>) {
  const { t } = useTranslation();
  if (!state.failure) return null;
  if (state.inspectionRequired) {
    return (
      <Alert
        showIcon
        type="warning"
        message={t(`alertRules.import.failure.${state.failure.kind}`)}
        description={t('alertRules.import.failure.uncertain')}
        action={
          <Button size="small" loading={state.busy} onClick={() => void onInspect()}>
            {t('alertRules.import.inspect')}
          </Button>
        }
      />
    );
  }
  return <Alert showIcon type="error" message={t(`alertRules.import.failure.${state.failure.kind}`)} />;
}
