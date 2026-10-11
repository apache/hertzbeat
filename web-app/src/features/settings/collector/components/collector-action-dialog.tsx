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
