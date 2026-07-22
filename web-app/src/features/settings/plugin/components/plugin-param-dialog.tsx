/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Form, Modal, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import type { PluginParamDraft, PasswordDraft } from '../model/plugin-params-contract';
import type { PluginFailureKind, PluginRecord } from '../model/plugin-model';
import { isPluginParamVisible, localizedPluginParamName } from '../model/plugin-params-model';
import { PluginParamField } from './plugin-param-field';

type PluginParamDialogController = {
  editor: { plugin: PluginRecord; draft: PluginParamDraft | null } | null;
  failure: PluginFailureKind | null;
  invalid: string[];
  busy: boolean;
  actions: {
    cancel: () => void;
    save: () => Promise<void>;
    updateValue: (field: string, value: unknown) => void;
    updatePassword: (field: string, value: PasswordDraft) => void;
  };
};

export function PluginParamDialog(props: { controller: PluginParamDialogController }) {
  const { t, i18n } = useTranslation();
  const { controller } = props;
  const draft = controller.editor?.draft;
  return (
    <Modal
      open={Boolean(controller.editor)}
      title={t('plugins.params.title', { name: controller.editor?.plugin.name })}
      confirmLoading={controller.busy}
      closable={!controller.busy}
      keyboard={!controller.busy}
      cancelButtonProps={{ disabled: controller.busy }}
      okButtonProps={{ disabled: !draft }}
      maskClosable={false}
      destroyOnHidden
      onCancel={controller.actions.cancel}
      onOk={() => void controller.actions.save()}
    >
      {controller.failure && <Alert type="error" showIcon message={t(`plugins.failure.${controller.failure}`)} />}
      {!draft && !controller.failure && <Skeleton active />}
      {draft && (
        <Form layout="vertical">
          {draft.defines
            .filter(define => isPluginParamVisible(define, draft.values))
            .map(define => (
              <Form.Item
                key={define.field}
                label={localizedPluginParamName(define, i18n.language)}
                required={define.required}
                {...(controller.invalid.includes(define.field)
                  ? { validateStatus: 'error' as const, help: t('plugins.params.invalid') }
                  : {})}
              >
                <PluginParamField
                  define={define}
                  value={draft.values[define.field]}
                  {...(draft.passwords[define.field] ? { password: draft.passwords[define.field] } : {})}
                  t={t}
                  onChange={value => controller.actions.updateValue(define.field, value)}
                  onPassword={value => controller.actions.updatePassword(define.field, value)}
                />
              </Form.Item>
            ))}
        </Form>
      )}
    </Modal>
  );
}
