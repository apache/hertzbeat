/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

import type { CollectorMutationCommand } from '../model/collector-model';

export function CollectorActionDialog({
  command,
  pending,
  onCancel,
  onConfirm
}: {
  command: CollectorMutationCommand | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  if (!command) return null;
  const batch = command.collectors.length > 1;
  const title = t(`collectors.confirm.${command.action}.${batch ? 'batch' : 'single'}`);
  const confirm = t(command.action === 'delete' ? 'collectors.delete' : `collectors.${command.action}`);
  return (
    <Modal
      open
      title={title}
      okText={confirm}
      cancelText={t('common.cancel')}
      okButtonProps={{ danger: command.action !== 'online' }}
      confirmLoading={pending}
      closable={!pending}
      maskClosable={false}
      onCancel={onCancel}
      onOk={() => void onConfirm()}
    >
      {t('collectors.confirm.description', { count: command.collectors.length })}
    </Modal>
  );
}
